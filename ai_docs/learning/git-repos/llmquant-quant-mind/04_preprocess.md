# Preprocess Layer — LLMQuant / quant-mind

Files covered: `quantmind/preprocess/clean.py`, `quantmind/preprocess/time.py`, `quantmind/preprocess/fetch/`, `quantmind/preprocess/format/`

The preprocess layer is the **dumb pipe** of the system. It knows how to fetch bytes and clean text. It does NOT know about Pydantic schemas, knowledge types, or LLM outputs. That mapping happens in `flows/`.

All async functions use `asyncio.to_thread` for CPU-bound work (PDF parsing, HTML extraction). I/O-bound work (HTTP fetches) uses native `httpx.AsyncClient`.

---

## Fetch Layer (`preprocess/fetch/`)

### `_types.py` — The Return Contract

Every fetch function returns either `Fetched` or `RawPaper` (a subclass).

```python
@dataclass(frozen=True, slots=True)
class Fetched:
    bytes: bytes            # raw payload
    content_type: str       # MIME type, e.g. "application/pdf" or "text/html"
    source_url: str | None = None
    headers: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RawPaper(Fetched):
    arxiv_id: str = ""
    title: str | None = None
    authors: tuple[str, ...] = ()
    abstract: str | None = None
    published_at: datetime | None = None
    primary_category: str | None = None
    categories: tuple[str, ...] = ()
```

**Why `dataclass` (not Pydantic)**:
> "These are intentionally dataclasses — fetch is internal plumbing, not an LLM boundary, so we want zero validation overhead and hashable value types."

Frozen dataclasses are:
- Hashable (can be used as dict keys or in sets)
- Immutable without a copy (thread-safe)
- ~3x faster to construct than Pydantic models
- Fine for internal plumbing where you control all call sites

**Why `slots=True`**: Python `__slots__` eliminates the per-instance `__dict__` overhead. For objects created thousands of times (one per fetched document), this saves significant memory.

**Why `tuple[str, ...]` for `authors` and `categories`**: Tuples are hashable; lists are not. Since `RawPaper` is frozen, all fields must be hashable. Authors and categories are always multi-valued and never mutated.

---

### `http.py` — Generic HTTP Fetcher

```python
DEFAULT_USER_AGENT = (
    "QuantMind/0.2 (+https://github.com/LLMQuant/quant-mind) "
    "preprocess.fetch.http"
)

async def fetch_url(
    url: str,
    *,
    timeout: float = 30.0,
    max_bytes: int = 50_000_000,   # 50MB hard cap
    user_agent: str = DEFAULT_USER_AGENT,
) -> Fetched:
```

**Streaming with size cap**:
```python
async with client.stream("GET", url, headers=headers) as response:
    response.raise_for_status()
    chunks: list[bytes] = []
    received = 0
    async for chunk in response.aiter_bytes():
        received += len(chunk)
        if received > max_bytes:
            raise ValueError(f"response body exceeded max_bytes={max_bytes}")
        chunks.append(chunk)
```

Uses `client.stream()` instead of `client.get()`. This means the response is never fully buffered into memory before the size check. For a 200MB file, the fetch aborts at 50MB without downloading the rest. This is important when scraping arbitrary URLs.

**Content-type normalisation**:
```python
raw_content_type = response.headers.get("content-type", "application/octet-stream")
content_type = raw_content_type.split(";", 1)[0].strip().lower()
```

Strips the charset parameter: `"text/html; charset=utf-8"` → `"text/html"`. The format layer can then do clean `if ct.startswith("text/html")` checks without parsing charset variants.

**Captured headers** (for dedup + caching):
```python
_CAPTURED_HEADERS = ("content-type", "content-length", "etag", "last-modified",
                     "content-disposition")
```

Only these five are captured. `ETag` and `Last-Modified` are useful for conditional GET (cache validation). `Content-Disposition` carries the filename for files served from PDFs.

---

### `arxiv.py` — arXiv Fetcher

```python
# Accepts all of:
#   2401.12345
#   2401.12345v3
#   arXiv:2401.12345
#   https://arxiv.org/abs/2401.12345
#   https://arxiv.org/pdf/2401.12345v2.pdf
#   cs.AI/0102001 (legacy format)
_NEW_ID_PATTERN = re.compile(r"\d{4}\.\d{4,5}(?:v\d+)?")
_LEGACY_ID_PATTERN = re.compile(r"[a-z\-]+(?:\.[A-Z]{2})?/\d{7}(?:v\d+)?")
```

`_extract_arxiv_id` handles all these formats by:
1. Stripping `arXiv:` / `arxiv:` prefixes
2. Running both patterns via `.search()` (finds the pattern anywhere in the string)
3. Returning the match group (canonical ID only, no URL prefix)

**Async + sync mixing**:
```python
async def fetch_arxiv(id_or_url: str) -> RawPaper:
    arxiv_id = _extract_arxiv_id(id_or_url)
    # arxiv.Client() is sync → run in thread to avoid blocking event loop
    result = await asyncio.to_thread(_fetch_metadata_sync, arxiv_id)
    # httpx PDF download is native async
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(pdf_url, headers={"User-Agent": DEFAULT_USER_AGENT})
        response.raise_for_status()
        pdf_bytes = response.content
```

The `arxiv` Python library uses a sync `requests`-based client. `asyncio.to_thread` runs it in a thread pool so it doesn't block the event loop. The PDF download uses `httpx` natively async. The 60-second timeout is intentionally long — arXiv PDFs can be large.

---

### `local.py` — Local File Reader

Not read in detail, but follows the same pattern: returns `Fetched` with `content_type` inferred from file extension (`.pdf` → `application/pdf`, `.html` → `text/html`, etc.) and `source_url=None`.

---

### `doi.py` — DOI Resolver

Currently only fetches CrossRef metadata (title, publisher, `primary_url`). The unpaywall fallback (DOI → Open Access PDF URL) is pending as a follow-up issue. `paper_flow` raises `NotImplementedError` when `DoiIdentifier` input is passed.

---

## Format Layer (`preprocess/format/`)

### `pdf.py` — PDF to Markdown

```python
async def pdf_to_markdown(pdf_bytes: bytes) -> str:
    if not pdf_bytes:
        raise PdfParseError("pdf_bytes is empty")
    return await asyncio.to_thread(_extract_text_sync, pdf_bytes)

def _extract_text_sync(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_texts = []
        for page in doc:
            extracted = page.get_text()
            text = extracted if isinstance(extracted, str) else ""
            if text.strip():
                page_texts.append(text)
    finally:
        doc.close()
    return "\n\n".join(page_texts)
```

**What PyMuPDF gives you**: Plain text, concatenated per page. No heading detection. No table reconstruction. No math rendering. Empty pages are dropped.

**What it does NOT give you**: Structural markdown. `# Section Title` headings, `| table |` formatting, `$formula$` math — none of these. The docstring explicitly says:
> "PyMuPDF returns plain text rather than rich markdown — there is no structural tree (headings, tables, math) reconstruction. Downstream consumers that need higher-fidelity markdown should wait for the marker-pdf engine option."

**`finally: doc.close()`**: PyMuPDF holds file handles. Always close the document even if page iteration raises. The `try/finally` pattern ensures cleanup.

---

### `html.py` — HTML to Markdown

```python
async def html_to_markdown(
    html: str,
    *,
    strip_boilerplate: bool = True,
) -> str:
    if not html.strip():
        return ""
    return await asyncio.to_thread(
        _extract_sync, html, strip_boilerplate=strip_boilerplate
    )

def _extract_sync(html: str, *, strip_boilerplate: bool) -> str:
    extracted = trafilatura.extract(
        html,
        output_format="markdown",
        include_links=True,
        include_images=False,
        include_tables=True,
        favor_recall=not strip_boilerplate,
    )
    return extracted or ""
```

**`favor_recall=not strip_boilerplate`**: When `strip_boilerplate=True` (default), `favor_recall=False` — trafilatura is aggressive about removing navigation, footers, sidebars, cookie banners, "Related articles" sections. When `strip_boilerplate=False`, `favor_recall=True` — trafilatura keeps more peripheral content at the cost of more noise. Use `strip_boilerplate=False` for pages that don't have obvious boilerplate (e.g., plain GitHub README pages).

**Why `include_images=False`**: Images become `![alt](src)` markdown. Since the content will be fed to an LLM as text, image URLs are useless noise. Tables are kept (`include_tables=True`) because financial pages often have important tabular data.

---

## Clean Layer (`clean.py`)

Three standalone functions, each takes `str` → returns `str`. Composable in any order.

### `normalize_unicode(text: str) -> str`

```python
_LIGATURE_MAP: dict[str, str] = {
    "\ufb00": "ff",    # ligature ff (U+FB00)
    "\ufb01": "fi",    # ligature fi (U+FB01)
    "\ufb02": "fl",    # ligature fl (U+FB02)
    "\ufb03": "ffi",   # ligature ffi (U+FB03)
    "\ufb04": "ffl",   # ligature ffl (U+FB04)
    "\u2018": "'",     # left single quote
    "\u2019": "'",     # right single quote
    "\u201c": '"',     # left double quote
    "\u201d": '"',     # right double quote
    "\u2013": "-",     # en dash
    "\u2014": "-",     # em dash
    "\u2026": "...",   # ellipsis
    "\u00a0": " ",     # non-breaking space
}

_LIGATURE_RE = re.compile("|".join(re.escape(k) for k in _LIGATURE_MAP))
_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

def normalize_unicode(text: str) -> str:
    if not text:
        return ""
    normalized = unicodedata.normalize("NFKC", text)
    normalized = _LIGATURE_RE.sub(lambda m: _LIGATURE_MAP[m.group(0)], normalized)
    normalized = _CONTROL_RE.sub("", normalized)
    return normalized
```

**Order matters — three passes**:

1. **NFKC first**: Unicode normalization collapses compatibility characters. Fullwidth digits `①②③` → ASCII `123`. Half-width katakana → full-width. This handles a wide class of issues automatically.

2. **Ligature map second**: NFKC leaves ligatures alone (they are "canonical" in NFKC). The targeted map catches the PDF-specific ones (`ﬁ`, `ﬂ`, `ﬀ`). A single compiled regex replaces all in one pass.

3. **Control character drop last**: PDF extraction commonly leaks control characters like `\x01`, `\x0c` (form feed). Dropping them after normalization ensures NFKC doesn't accidentally create control chars.

**"Conservative on purpose"**: The comment explains that diacritics are NOT removed (e.g., `é` stays `é`). This is important for Indian company names that may contain diacritics. Only the searchability-breaking characters are normalised.

**SachNetra P0 use case**: If NSE announcement PDFs contain `ﬁnancial` (ligature) instead of `financial`, and SachNetra's regex looks for `"financial results"`, it silently misses the match. Run `normalize_unicode` before any regex.

---

### `collapse_whitespace(text: str) -> str`

```python
_HORIZONTAL_WS_RE = re.compile(r"[ \t\f\v]+")
_TRIPLE_NEWLINE_RE = re.compile(r"\n{3,}")

def collapse_whitespace(text: str) -> str:
    collapsed = _HORIZONTAL_WS_RE.sub(" ", text)
    collapsed = _TRIPLE_NEWLINE_RE.sub("\n\n", collapsed)
    lines = [line.rstrip() for line in collapsed.split("\n")]
    return "\n".join(lines).strip()
```

**Three operations**:
1. Collapse runs of spaces/tabs/form-feeds/vertical-tabs to a single space
2. Collapse 3+ consecutive newlines to 2 (preserve paragraph breaks but remove PDF-extracted whitespace blobs)
3. Strip trailing whitespace from each line

**Why preserve double newlines**: In markdown, a blank line (`\n\n`) is a paragraph separator. Collapsing all newlines to one would destroy paragraph structure. This function is markdown-aware.

---

### `dedupe_lines(text: str) -> str`

```python
def dedupe_lines(text: str) -> str:
    output = []
    last = None
    for line in text.split("\n"):
        key = line.strip()
        if key and key == last:
            continue
        output.append(line)
        last = key
    return "\n".join(output)
```

**Use case**: PDF page headers and footers repeat on every page:
```
Page 1 of 47
Tata Motors Limited — Annual Report FY2026
[content]
Page 2 of 47
Tata Motors Limited — Annual Report FY2026
[content]
```

`dedupe_lines` drops the second "Page 2 of 47" and second "Tata Motors Limited — Annual Report FY2026" because each is identical to the previous occurrence.

**"Consecutive" is key**: It only removes *adjacent* duplicates. Non-consecutive duplicate lines (e.g., the word "Revenue" appearing in multiple sections) are kept. `key = line.strip()` means leading/trailing whitespace differences are ignored for comparison purposes.

---

## Time Helpers (`time.py`)

### `parse_filing_date(value: str) -> datetime`

```python
_DATE_FORMATS: tuple[str, ...] = (
    "%Y-%m-%dT%H:%M:%S.%fZ",     # ISO 8601 with milliseconds
    "%Y-%m-%dT%H:%M:%SZ",         # ISO 8601 with Z suffix
    "%Y-%m-%dT%H:%M:%S%z",        # ISO 8601 with timezone offset
    "%Y-%m-%dT%H:%M:%S",          # ISO 8601 without timezone
    "%Y-%m-%d %H:%M:%S",          # SQL datetime format
    "%Y-%m-%d",                   # ISO date only
    "%Y/%m/%d",                   # slash-separated date
    "%d %b %Y",                   # "23 May 2026"
    "%d %B %Y",                   # "23 May 2026" (full month name)
    "%b %d, %Y",                  # "May 23, 2026"
    "%B %d, %Y",                  # "May 23, 2026" (full month name)
)

def parse_filing_date(value: str) -> datetime:
    text = value.strip()
    last_error = None
    for fmt in _DATE_FORMATS:
        try:
            parsed = datetime.strptime(text, fmt)
        except ValueError as exc:
            last_error = exc
            continue
        return to_utc(parsed)
    raise ValueError(f"could not parse date {value!r}; tried {len(_DATE_FORMATS)} formats")
```

**"More specific patterns first"**: `"%Y-%m-%dT%H:%M:%S.%fZ"` is tried before `"%Y-%m-%d"`. If you tried the date-only format first, `"2024-04-15T10:30:00Z"` would parse partially (the date part) and return a wrong result. Specificity-first ordering prevents this.

**Always returns UTC**: `to_utc(parsed)` treats naive datetimes as UTC. No local timezone guessing.

**SachNetra use case**: NSE Bourse returns dates in `"dd-MMM-yyyy hh:mm:ss"` format (e.g., `"23-May-2026 09:15:00"`). SachNetra currently uses `new Date(str)` which is locale-dependent and fails on this format. `parse_filing_date` handles 11 formats reliably and always returns UTC.

---

### `business_days_between(a: date, b: date) -> int`

```python
def business_days_between(a: date, b: date) -> int:
    if a > b:
        a, b = b, a
    total_days = (b - a).days + 1
    full_weeks, remainder = divmod(total_days, 7)
    weekdays = full_weeks * 5
    start_dow = a.weekday()
    for offset in range(remainder):
        if (start_dow + offset) % 7 < 5:  # 0..4 = Mon..Fri
            weekdays += 1
    return weekdays
```

**No holiday calendar**: Weekdays only (Mon–Fri). The docstring notes "No holiday calendar — that arrives in a follow-up issue." For SachNetra's event-study calculations (e.g., "price return 3 business days after filing"), this is sufficient for a first pass.

**Direction-insensitive**: `if a > b: a, b = b, a`. Always sorts before counting. So `business_days_between(friday, monday)` returns 2, same as `business_days_between(monday, friday)`.

**Algorithm**: Full weeks contribute exactly 5 weekdays each. The remainder days are counted by walking from `a`'s day-of-week, checking if each day falls on Mon–Fri (weekday < 5).

---

## Composition Pattern

The full preprocess pipeline for an arXiv paper:

```python
# Fetch
raw = await fetch_arxiv("2401.12345")          # → RawPaper (bytes + metadata)

# Format
text = await pdf_to_markdown(raw.bytes)         # → plain text (page-separated)

# Clean (compose in order)
text = normalize_unicode(text)                  # → ligature-free, control-char-free
text = collapse_whitespace(text)               # → clean paragraph structure
text = dedupe_lines(text)                      # → no repeated headers/footers

# Ready for LLM
# → pass to paper_flow's Agent as prompt
```

For an NSE news article URL:
```python
raw = await fetch_url("https://nsearchives.nseindia.com/...")   # → Fetched
text = await html_to_markdown(raw.bytes.decode("utf-8"))        # → markdown
text = normalize_unicode(text)
text = collapse_whitespace(text)
# → pass to news_flow's Agent
```
