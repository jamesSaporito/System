---
name: infracost
description: Required after any change under infra/ (Terraform .tf files, modules, variables, outputs or lock files). Installs infracost if missing, validates the Terraform without touching the user's .terraform folders, and runs infracost, showing its exact output.
---

# Terraform changes: validate, then infracost

Every time Terraform under `infra/` is added or changed, finish with these steps before reporting back. Don't skip them for small changes.

## 1. Make sure infracost is installed

```sh
infracost --version
```

If the command is missing, install it and check again:

```sh
brew install infracost
infracost --version
```

If installing fails or infracost asks to sign in, stop and tell the user the exact command to run; never estimate costs yourself instead.

## 2. Validate

Run from the repo root. Validation uses Docker with the pinned Terraform version and a scratch `TF_DATA_DIR`, so the user's own `.terraform` folders (their `terraform init` state) are never read, changed or deleted.

```sh
docker run --rm -v "$PWD/infra":/infra -w /infra hashicorp/terraform:1.17.0 fmt -recursive

for stack in bootstrap envs/prod; do
  data="$CLAUDE_JOB_DIR/tmp/tf-${stack//\//-}"   # any scratch folder outside the repo
  mkdir -p "$data"
  docker run --rm -v "$PWD/infra":/infra -v "$data":/data -e TF_DATA_DIR=/data -w "/infra/$stack" \
    hashicorp/terraform:1.17.0 init -backend=false -input=false -no-color >/dev/null
  docker run --rm -v "$PWD/infra":/infra -v "$data":/data -e TF_DATA_DIR=/data -w "/infra/$stack" \
    hashicorp/terraform:1.17.0 validate -no-color
done
```

Never delete `infra/**/.terraform`, and never run `terraform init` in the user's stack folders.

## 3. Run infracost

From the repo root, scan the whole `infra` folder. Scanning a single stack folder fails because it can't load the modules.

```sh
infracost scan infra --no-color
```

## 4. Show the output exactly

Paste infracost's full output into the reply in a code block, exactly as printed: no summary, no trimming, no reformatting. Any commentary goes after it and never replaces it.
