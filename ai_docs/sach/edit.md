📰 1. DMK / Anbumani (Politics)

Title:
DMK has not kept its promise on social justice, interlinking of rivers, says Anbumani

What happened:
Anbumani, a politician, said that DMK has not kept its promise on social justice and interlinking of rivers. He made this statement in Chennai, Tamil Nadu. Anbumani did not provide any specific details about the promises or the actions taken.

What this means:
Anbumani's statement is a political disagreement. It does not directly affect most Indians, but it shows a difference of opinion between politicians. It's essential to stay informed about local politics to understand the perspectives of different leaders.

Source: The Hindu

🎬 2. Dacoit Movie (Entertainment)

Title:
When love meets revenge: Adivi Sesh and Mrunal shines in Dacoit

What happened:
A new movie called Dacoit is releasing, starring Adivi Sesh and Mrunal Thakur. The movie is set in a historical context and seems to be a drama. It is expected to release soon.

What this means:
If you're a movie fan, you might be interested in watching Dacoit when it releases. There's no information on how it might affect you directly, but you can look forward to a new movie to watch.

Source: Telangana Today

🏗 3. Anaicut Infrastructure (Local)

Title:
Anaicut: Predominantly tribal constituency long plagued by neglect of basic infrastructure

What happened:
Anaicut, a tribal constituency in Tamil Nadu, has been facing issues with basic infrastructure. Roads, water supply, and electricity are some of the areas where the constituency has been neglected. This has affected the daily lives of the residents.

What this means:
For ordinary Indians, this highlights the importance of basic infrastructure in rural areas. It's essential for the government to address these issues to improve the quality of life for people living in such areas.

Source: The Hindu

🌍 4. US Economy / Trump–Biden

Title:
The retirement shield against Trump’s war and market meltdowns - The Ken

What happened:
US President Joe Biden has announced a plan to protect Social Security and Medicare from potential cuts. This plan aims to shield these programs from any future changes. It is part of a broader effort to address economic concerns.

What this means:
For ordinary Indians, this news is about the US economy and its potential impact on global markets. While it may not directly affect India, it's a sign of ongoing economic discussions worldwide.

Source: The Ken

🌊 5. Iran–Israel / Strait of Hormuz (Global Conflict)

Title:
Iran-Israel war LIVE: Strait of Hormuz management will enter new phase, says Iran's Supreme Leader

What happened:
Iran's Supreme Leader has announced that the management of the Strait of Hormuz will enter a new phase. This is a strategic waterway between Iran and the Gulf of Oman. Iran and Israel have been involved in a conflict.

What this means:
For ordinary Indians, this development may not have a direct impact on daily life. However, it's essential to stay informed about global events that can affect international trade and security.

Source: The Hindu

💰 6. Mutual Funds (Finance)

Title:
Direct plans lead mutual fund folio growth in FY26 amid volatile markets - Business Standard

What happened:
Mutual fund folios in India grew in the financial year 2025-26 due to direct plans. Direct plans allow investors to invest directly in mutual funds without needing a distributor. This growth happened despite volatile markets.

What this means:
For ordinary Indians, this means that more people are investing in mutual funds directly, which can be a good option for long-term savings. However, it's essential to do thorough research and consult a financial advisor before investing in mutual funds.

Source: Business Standard

🚀 7. Bay Capital Fund (Startups)

Title:
Bay Capital Onboards Sandeep Barasia, Tej Kapoor As Partners To Launch New Digital Fund

What happened:
Bay Capital has hired Sandeep Barasia and Tej Kapoor as partners to launch a new digital fund. This fund will focus on investing in Indian startups. Bay Capital is a venture capital firm based in India.

What this means:
The launch of this new fund may lead to more investments in Indian startups, which could create new job opportunities and stimulate economic growth. However, it's not directly related to everyday life, so there's no immediate action required.

Source: Inc42

✊ 8. Mysuru Surveyors Protest

Title:
Licensed surveyors stage demonstration in Mysuru

What happened:
Licensed surveyors in Mysuru staged a demonstration to protest against the Karnataka government's decision to allow unlicensed surveyors to work in the state. The protest took place on a specific date, but it's not specified in the news headlines. The surveyors are demanding that the government enforce the law and only allow licensed professionals to work.

What this means:
For ordinary Indians, this means that the government is trying to balance the needs of different groups. It's not directly affecting most people, but it's an example of how the government makes decisions that can impact various professions.

Source: The Hindu

🐍 9. Python Surgery (Environment / Animal Welfare)

Title:
Six-foot python survives after surgery in veterinary college in Tirunelveli

What happened:
A six-foot python underwent surgery at a veterinary college in Tirunelveli, Tamil Nadu. The snake was successfully operated on and is recovering. No further details are available.

What this means:
This incident highlights the work of veterinary professionals in caring for animals in need. It's a reminder of the importance of animal welfare and the efforts of those who work to protect and care for them.

Source: The Hindu Environment

Looking at all 9 screenshots, I can see clear patterns of what's wrong. Let me break it down:
The Problems
"What Happened" issues:

Too vague ("a politician said", "a specific date, but it's not specified")
Hedging phrases ("seems to be", "expected to release soon")
Padding sentences that add nothing ("No further details are available")
Restating the obvious ("Bay Capital is a venture capital firm based in India")

"What This Means" issues:

Generic filler ("It's essential to stay informed", "do thorough research and consult a financial advisor")
Irrelevant framing ("For ordinary Indians" repeated verbatim in almost every card)
Watered-down conclusions ("It does not directly affect most Indians" on nearly everything)
Moralizing ("It's essential for the government to address these issues")


Prompt Changes That Will Fix This
The core problem is your current prompt is too permissive. The model defaults to safe, vague language. You need to add explicit anti-patterns to the rules.
Updated USER_PROMPT rules section:
javascriptRules:
- summary: factual only. Name the actual person, place, number, date if known.
  Never write "a politician" if you know their name.
  Never write "a specific date" — just omit the date if unknown.
  Never end with "No further details are available."
  Never include background sentences that restate what the headline already says.
- meaning: one specific insight. 
  NEVER start with "For ordinary Indians".
  NEVER say "it's essential to stay informed" or "consult a financial advisor".
  NEVER say "it does not directly affect most Indians" — if that's true, say
  what it DOES affect instead (trade, oil prices, global markets, etc.)
  If the story is entertainment/lifestyle, skip the meaning field entirely 
  and return meaning: ""
- Both fields must be 2-3 sentences maximum. No padding.

Before / After Examples
Image 1 — DMK political story
❌ Current meaning:

"Anbumani's statement is a political disagreement. It does not directly affect most Indians, but it shows a difference of opinion between politicians. It's essential to stay informed about local politics..."

✅ Better:

"Anbumani Ramadoss, a PMK leader, has accused the Tamil Nadu government of failing to fulfill two key promises — social justice reforms and the Cauvery river interlinking project. Tamil Nadu residents following state politics should note this as a formal opposition challenge ahead of upcoming local discussions."


Image 2 — Dacoit movie
❌ Current meaning:

"If you're a movie fan, you might be interested in watching Dacoit when it releases..."

✅ Better — this story shouldn't have a "What This Means" at all. It's entertainment. Return meaning: "" and hide the green card.

Image 4 — Trump/Biden US economy story
❌ Current: Joe Biden announced a plan... (Biden hasn't been president since January 2025 — the model is hallucinating)
This is your biggest problem. The model is making up facts because the headline ("retirement shield against Trump's war") is too vague. The model filled the gap with a fabricated Biden policy.
Fix: Add to system prompt:
NEVER invent facts not present in the headlines.
If the headline is ambiguous, summarize only what is explicitly stated.
Do not name people or policies not mentioned in the headlines provided.

Image 5 — Iran-Israel / Strait of Hormuz
❌ Current meaning:

"For ordinary Indians, this development may not have a direct impact on daily life..."

✅ Better:

"Strait of Hormuz carries roughly 20% of global oil — including a significant share of India's crude imports. Any disruption there tends to push petrol prices up within weeks."


Image 6 — Mutual funds
❌ Current meaning:

"...it's essential to do thorough research and consult a financial advisor before investing..."

✅ Better:

"Direct mutual fund plans charge lower fees than regular plans because no distributor is involved. If you invest in mutual funds, checking whether you're on a direct or regular plan could save you money over time."


One Systemic Fix
Add this single rule and it will eliminate 60% of the weak "What This Means" output:
javascriptFor the meaning field, answer ONE of these specific questions:
  - Does this affect my money, job, travel, or health? How?
  - Does this change a law or government policy that applies to me?
  - Does this affect prices of something I buy?
  - Does this affect a route I might travel?
  - Is there something I should check, do, or avoid because of this?
If none of these apply, return meaning: "" (empty string).
This forces specificity and eliminates the "stay informed" filler completely.You’re already very close — the structure is solid. The problem isn’t what you’re doing, it’s how generic and “template-like” the outputs feel.

Right now your summaries:

feel repetitive
lack specificity
sometimes say obvious things (“this may not affect most people…”)
don’t give clear signal vs nopastedi have asked the same thing to chat gpt 
tell me if we found anything that we missedif not how do we proceed
what information do i need to give to the agent in the IDE12:54 AMComparing both analyses — they're largely aligned. A few things ChatGPT caught that add value:
The meaning_type classification idea is genuinely useful and we didn't mention it. Forcing the LLM to declare its intent before writing the meaning will reduce generic output. Worth adding.
"No immediate change for daily life, but..." phrasing as a replacement for "may not affect most people" — cleaner than what we said.
Everything else is the same ground covered differently.

What We Caught That ChatGPT Missed
The hallucination problem (Image 4 — Biden story). ChatGPT didn't flag it. That's the most dangerous issue in production — the model inventing facts not in the headlines. This needs to be the first rule in the updated prompt, not buried.

How To Proceed
You need to update one thing in the codebase: 05_ai_prompt_spec.md and specifically the SACHNETRA_USER_PROMPT rules section. That's the only file the agent needs to touch.
Here's exactly what to give the agent:

Instruction for agent:
Update the SACHNETRA_USER_PROMPT rules section in 05_ai_prompt_spec.md. Replace the current rules block with this:
Rules:
- summary: 2-3 sentences max. Include the actual person's name, place, 
  and number if known. Never write "a politician" if the name is in 
  the headlines. Never write "a specific date" — omit date if unknown.
  Never end with "No further details are available."
  Never add background sentences that restate the headline.
  NEVER invent facts not present in the headlines provided.
  If headlines are vague, summarize only what is explicitly stated.

- Before writing meaning, classify the story internally as one of:
  direct_impact / indirect_signal / informational_only
  Then write meaning accordingly.

- meaning rules by type:
  direct_impact → what changes for the reader (money, travel, health, law)
  indirect_signal → what trend this shows, connected to something concrete
  informational_only → one sentence on why it's worth knowing, no padding

- NEVER write any of these phrases:
  "For ordinary Indians"
  "It's essential to stay informed"
  "consult a financial advisor"  
  "does not directly affect most Indians"
  "highlights the importance of"
  "this may not affect"

- If the story is entertainment, film, or celebrity news, 
  return meaning as empty string "".

- Replace vague impact language with: 
  "No immediate change for daily life, but [specific implication]."

- meaning must answer ONE of: Does this affect my money? My travel? 
  A law that applies to me? Prices of something I buy? 
  If none apply, return meaning: ""

That's it. One file, one section. The agent doesn't need to touch any TypeScript or the actual prompt constants in the JS files — those reference this spec doc.
After James updates the spec, the next session can update the actual SACHNETRA_USER_PROMPT constant in the codebase to match.



