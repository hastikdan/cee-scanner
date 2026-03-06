import os, json
from datetime import datetime, timezone

def check_ai_summary(domain: str, scan_results: list, country: str = "") -> dict:
    result = {
        "check": "ai_summary", "domain": domain,
        "status": "ok", "title": "", "detail": "",
        "score_impact": 0,
        "scanned_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        import anthropic
        client = anthropic.Anthropic()

        critical = [r for r in scan_results if r.get("status") == "critical"]
        warnings = [r for r in scan_results if r.get("status") == "warning"]
        ok       = [r for r in scan_results if r.get("status") == "ok"]
        total_risk = sum(r.get("score_impact", 0) for r in scan_results)

        scan_text = f"Domain: {domain}\nCountry: {country or 'Unknown'}\nRisk Score: {total_risk}\n\n"
        scan_text += f"CRITICAL ({len(critical)}):\n"
        for r in critical:
            scan_text += f"  [{r['check'].upper()}] {r.get('title','')} | {r.get('detail','')}\n"
        scan_text += f"\nWARNINGS ({len(warnings)}):\n"
        for r in warnings:
            scan_text += f"  [{r['check'].upper()}] {r.get('title','')} | {r.get('detail','')}\n"
        scan_text += f"\nPASSED: {len(ok)} checks\n"

        prompt = f"""You are a senior cybersecurity analyst specialising in European corporate security.
Analyse this automated scan for {domain} and produce a structured threat intelligence report.

{scan_text}

Produce exactly these 5 sections:

1. EXECUTIVE SUMMARY
2-3 sentences. Overall risk verdict (HIGH RISK / MEDIUM RISK / LOW RISK) and why.

2. CRITICAL FINDINGS
Plain-language explanation of each critical issue and what an attacker could do with it.

3. THREAT SCENARIOS
2 specific, realistic attack scenarios an adversary could execute against this domain today.

4. PRIORITISED RECOMMENDATIONS
Numbered list. Each: what to fix, difficulty (Easy/Medium/Hard), estimated time, exact command or step.

5. INTELLIGENCE NOTES
Any IOCs, hosting anomalies, registrar patterns relevant to this domain.

Be direct and specific. Write for a security professional."""

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        analysis = response.content[0].text.strip()
        analysis_upper = analysis.upper()

        if "HIGH RISK" in analysis_upper or total_risk >= 60 or len(critical) >= 3:
            status = "critical"
            verdict = "HIGH RISK"
        elif "MEDIUM RISK" in analysis_upper or total_risk >= 30 or len(critical) >= 1:
            status = "warning"
            verdict = "MEDIUM RISK"
        else:
            status = "ok"
            verdict = "LOW RISK"

        result["status"] = status
        result["title"]  = f"AI Analysis: {verdict}"
        result["detail"] = analysis
        return result

    except Exception as e:
        result["status"] = "error"
        result["title"]  = "AI analysis failed"
        result["detail"] = str(e)[:120]
        return result
