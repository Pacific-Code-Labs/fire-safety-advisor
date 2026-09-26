#!/usr/bin/env bash
# Materialize the landing's public build configuration from SSM (app URL + public content API).
# Every value under this path is baked into the static site (public by design).
# Usage: bash scripts/load-env-from-ssm.sh [environment] [profile|-] [--output path|--github-env|--print-exports]
#   --print-exports  print `export VAR=value` lines on stdout and write no file; local dev uses
#                    eval "$(bash scripts/load-env-from-ssm.sh dev PACIFIC-PROD --print-exports)"
# Progress messages go to stderr so stdout stays clean for --print-exports.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENVIRONMENT="${1:-dev}"
AWS_PROFILE_NAME="${2:-${AWS_PROFILE:-PACIFIC-PROD}}"
if [[ $# -gt 0 ]]; then shift; fi
if [[ $# -gt 0 ]]; then shift; fi

OUTPUT_FILE="${REPO_ROOT}/.env.local"
OUTPUT_MODE="replace"
if [[ "${1:-}" == "--output" ]]; then
  [[ -n "${2:-}" ]] || { echo "--output requires a path" >&2; exit 2; }
  OUTPUT_FILE="$2"
elif [[ "${1:-}" == "--print-exports" ]]; then
  OUTPUT_MODE="exports"
elif [[ "${1:-}" == "--github-env" ]]; then
  [[ -n "${GITHUB_ENV:-}" ]] || { echo "GITHUB_ENV is not set" >&2; exit 2; }
  OUTPUT_FILE="${GITHUB_ENV}"
  OUTPUT_MODE="append"
elif [[ $# -gt 0 ]]; then
  echo "Unknown argument: $1" >&2
  exit 2
fi

case "${ENVIRONMENT}" in
  dev|stag|prod) ;;
  *) echo "Environment must be dev, stag, or prod" >&2; exit 2 ;;
esac

DEPLOY_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
BASE_PATH="/fire-code/${ENVIRONMENT}/web"
AWS_ARGS=(--region "${DEPLOY_REGION}")
if [[ -n "${AWS_PROFILE_NAME}" && "${AWS_PROFILE_NAME}" != "-" ]]; then
  AWS_ARGS+=(--profile "${AWS_PROFILE_NAME}")
fi

echo "Resolving web configuration from ${BASE_PATH}..." >&2
PARAMS="$(aws ssm get-parameters-by-path \
  --path "${BASE_PATH}" \
  --recursive \
  --query 'Parameters[].[Name,Value]' \
  --output text \
  "${AWS_ARGS[@]}")"

get_parameter() {
  local key="$1"
  awk -F '\t' -v name="${BASE_PATH}/${key}" \
    '$1 == name { print $2; found=1 } END { exit !found }' <<<"${PARAMS}"
}

CONFIG_LINES=()
add_line() {
  local variable="$1" key="$2" value="$3"
  if [[ "${value}" == *$'\n'* || "${value}" == *$'\r'* ]]; then
    echo "Invalid multiline value in ${BASE_PATH}/${key}" >&2
    exit 1
  fi
  CONFIG_LINES+=("${variable}=${value}")
  echo "  ${variable} <- ${BASE_PATH}/${key}" >&2
}

# The landing reads ONLY these (no user pool, no app API): the app URL for its links and the
# anonymous content API for published overrides. All optional: the code falls back to the prod
# app domain and to the bundled content.
while IFS=':' read -r variable key; do
  if value="$(get_parameter "${key}")"; then
    add_line "${variable}" "${key}" "${value}"
  else
    echo "Optional parameter ${BASE_PATH}/${key} is absent." >&2
  fi
done <<'MAP'
VITE_APP_URL:site/app-url
VITE_PUBLIC_API_URL:public-api/url
VITE_PUBLIC_IDENTITY_POOL_ID:public-api/identity-pool-id
MAP

if [[ "${OUTPUT_MODE}" == "exports" ]]; then
  for line in "${CONFIG_LINES[@]}"; do
    printf 'export %s=%q\n' "${line%%=*}" "${line#*=}"
  done
  exit 0
fi

umask 077
if [[ "${OUTPUT_MODE}" == "append" ]]; then
  printf '%s\n' "${CONFIG_LINES[@]}" >> "${OUTPUT_FILE}"
else
  mkdir -p "$(dirname "${OUTPUT_FILE}")"
  TEMP_FILE="$(mktemp "${OUTPUT_FILE}.tmp.XXXXXX")"
  {
    printf '# Generated from %s; do not edit or commit.\n' "${BASE_PATH}"
    printf '%s\n' "${CONFIG_LINES[@]}"
  } > "${TEMP_FILE}"
  mv "${TEMP_FILE}" "${OUTPUT_FILE}"
fi

echo "Web environment written to ${OUTPUT_FILE}." >&2
