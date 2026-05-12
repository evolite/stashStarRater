import re, os

version = os.environ['VERSION']
hash_   = os.environ['HASH']
date    = os.environ['DATE']
url     = os.environ['URL']

path = "/tmp/pages/index.yml"
with open(path) as f:
    content = f.read()

entry = (
    "- id: stashStarRater\n"
    "  name: Stash Star Rater\n"
    "  metadata:\n"
    "    description: For those who want to rate scenes 1-10 stars without fussing with decimal numbers\n"
    f"  version: {version}\n"
    f'  date: "{date}"\n'
    f"  path: {url}\n"
    f"  sha256: {hash_}"
)

if "id: stashStarRater" in content:
    content = re.sub(
        r'- id: stashStarRater\b.*?(?=\n- |\Z)',
        entry,
        content, flags=re.DOTALL
    )
else:
    content = content.rstrip('\n') + '\n' + entry + '\n'

with open(path, "w") as f:
    f.write(content)
