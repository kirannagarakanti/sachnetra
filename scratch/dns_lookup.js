import dns from 'dns';

function lookup(hostname) {
  return new Promise((resolve) => {
    dns.lookup(hostname, (err, address, family) => {
      if (err) {
        console.log(`DNS lookup for ${hostname} failed: ${err.message}`);
        resolve(null);
      } else {
        console.log(`DNS lookup for ${hostname}: ${address} (family: IPv${family})`);
        resolve(address);
      }
    });
  });
}

async function run() {
  await lookup('grid-india.in');
  await lookup('www.grid-india.in');
  await lookup('report.grid-india.in');
  await lookup('posoco.in');
  await lookup('www.posoco.in');
}

run();
