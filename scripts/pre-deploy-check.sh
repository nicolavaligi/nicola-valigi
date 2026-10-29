#!/usr/bin/env bash
# ==============================================================================
# pre-deploy-check.sh - Local validation for sitemap, hreflang, and links
# Usage: ./scripts/pre-deploy-check.sh [DOC_ROOT]
# ==============================================================================

set -euo pipefail

DOC_ROOT="${1:-.}"
ERRORS=0
WARNINGS=0

echo "🔍 Avvio validazione statica su: ${DOC_ROOT}"
echo "------------------------------------------------------------"

log_err() {
    echo -e "  ❌ [ERROR] $1"
    ERRORS=$((ERRORS + 1))
}

log_warn() {
    echo -e "  ⚠️  [WARN]  $1"
    WARNINGS=$((WARNINGS + 1))
}

log_ok() {
    echo -e "  ✅ [OK]    $1"
}

# Una URL pubblica diventa il file sul disco.
# / e /en/ sono cartelle: il file è index.html.
local_file_for_url() {
    local url="$1"
    local path target
    path=$(echo "$url" | sed -e 's|https://www.nicvaligi.com||' -e 's|https://nicvaligi.com||')
    if [[ -z "$path" || "$path" == "/" ]]; then
        echo "${DOC_ROOT}/index.html"
        return
    fi
    target="${DOC_ROOT}${path}"
    if [[ "$path" == */ ]]; then
        echo "${target}index.html"
    else
        echo "$target"
    fi
}

# ------------------------------------------------------------------------------
# 1. Verifica Sitemap XML
# ------------------------------------------------------------------------------
echo -e "\n1. Controllo Sintassi e Risorse nella Sitemap..."
SITEMAP="${DOC_ROOT}/sitemap.xml"

if [[ ! -f "$SITEMAP" ]]; then
    log_err "File sitemap.xml non trovato in ${DOC_ROOT}"
else
    if command -v xmllint &>/dev/null; then
        if xmllint --noout "$SITEMAP" 2>/dev/null; then
            log_ok "sitemap.xml è un XML valido."
        else
            log_err "sitemap.xml contiene errori di sintassi XML."
        fi
    else
        log_warn "xmllint non è installato: salto il controllo di sintassi."
    fi

    URLS=$(grep -o '<loc>[^<]*</loc>' "$SITEMAP" | sed -e 's/<[^>]*>//g')
    while IFS= read -r url; do
        [[ -z "$url" ]] && continue
        target_file=$(local_file_for_url "$url")
        path=$(echo "$url" | sed -e 's|https://www.nicvaligi.com||' -e 's|https://nicvaligi.com||')
        if [[ ! -f "$target_file" ]]; then
            log_err "Sitemap punta a file locale inesistente: $url -> $target_file"
        else
            log_ok "Sitemap URL verificato localmente: ${path:-/}"
        fi
    done <<< "$URLS"
fi

# ------------------------------------------------------------------------------
# 2. Verifica Link Rel Alternate (hreflang)
# ------------------------------------------------------------------------------
echo -e "\n2. Controllo Tag hreflang e Reciprocità..."

# sorgente:controparte sul disco:href atteso dell'altra lingua
PAGES=(
    "competenze.html|en/skills.html|https://www.nicvaligi.com/en/skills.html|en"
    "en/skills.html|competenze.html|https://www.nicvaligi.com/competenze.html|it"
    "index.html|en/index.html|https://www.nicvaligi.com/en/|en"
    "en/index.html|index.html|https://www.nicvaligi.com/|it"
    "ora.html|en/now.html|https://www.nicvaligi.com/en/now.html|en"
    "en/now.html|ora.html|https://www.nicvaligi.com/ora.html|it"
)

for pair in "${PAGES[@]}"; do
    IFS='|' read -r src_rel dest_rel expect_href expect_lang <<< "$pair"
    src="${DOC_ROOT}/${src_rel}"
    dest="${DOC_ROOT}/${dest_rel}"

    if [[ ! -f "$src" ]]; then
        log_err "Pagina sorgente mancante: $src"
        continue
    fi

    for lang in "it" "en" "x-default"; do
        if grep -q "hreflang=[\"']${lang}[\"']" "$src"; then
            log_ok "${src_rel} dichiara hreflang '${lang}'"
        else
            log_err "${src_rel} MANCA di hreflang '${lang}'"
        fi
    done

    if [[ ! -f "$dest" ]]; then
        log_err "$src fa riferimento a controparte inesistente: $dest"
    else
        log_ok "${src_rel} ha la controparte ${dest_rel}"
    fi

    if grep -q "hreflang=[\"']${expect_lang}[\"'] href=[\"']${expect_href}[\"']" "$src" \
        || grep -q "href=[\"']${expect_href}[\"'] hreflang=[\"']${expect_lang}[\"']" "$src"; then
        log_ok "${src_rel} ricambia hreflang '${expect_lang}' verso ${expect_href}"
    else
        log_err "${src_rel} non ricambia hreflang '${expect_lang}' verso ${expect_href}"
    fi
done

# ------------------------------------------------------------------------------
# 3. Link locali (html, css, js, immagini). Salta mailto, http e ancore.
# ------------------------------------------------------------------------------
echo -e "\n3. Controllo link locali..."

html_pages=(
    "${DOC_ROOT}/index.html"
    "${DOC_ROOT}/en/index.html"
    "${DOC_ROOT}/competenze.html"
    "${DOC_ROOT}/en/skills.html"
    "${DOC_ROOT}/ora.html"
    "${DOC_ROOT}/en/now.html"
)

for page in "${html_pages[@]}"; do
    [[ -f "$page" ]] || continue
    page_dir=$(dirname "$page")
    while IFS= read -r href; do
        [[ -z "$href" ]] && continue
        case "$href" in
            mailto:*|tel:*|http:*|https:*|data:*|\#*) continue ;;
        esac
        clean="${href%%\#*}"
        clean="${clean%%\?*}"
        [[ -z "$clean" ]] && continue
        if [[ "$clean" == /* ]]; then
            target="${DOC_ROOT}${clean}"
        else
            target="${page_dir}/${clean}"
        fi
        target=$(python3 -c 'import os,sys; print(os.path.normpath(sys.argv[1]))' "$target")
        if [[ -d "$target" ]]; then
            target="${target}/index.html"
        fi
        rel="${page#${DOC_ROOT}/}"
        if [[ ! -e "$target" ]]; then
            log_err "${rel} link rotto: $href"
        else
            log_ok "${rel} -> $href"
        fi
    done < <(grep -oE '(href|src)="[^"]+"' "$page" | sed -E 's/^(href|src)="//; s/"$//')
done

echo "------------------------------------------------------------"
echo "Errori: ${ERRORS}  Avvisi: ${WARNINGS}"
if [[ "$ERRORS" -gt 0 ]]; then
    exit 1
fi
exit 0
