#!/bin/bash
cd /home/pcwsl/ejercicios/crm_iswo
python3 -c 'import json; print(json.dumps({"body": open("pr_body.txt").read()}))' > /tmp/pr_patch.json
gh api repos/oortega14/crm_iswo/pulls/5 -X PATCH --input /tmp/pr_patch.json