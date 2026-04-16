"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectAssessment = detectAssessment;
const KEYWORDS = [
    "learning outcomes", "assessment criteria", "submission", "word count",
    "marking scheme", "task", "assignment", "module", "unit", "grade",
    "distinction", "merit", "pass", "deadline", "instructions"
];
function detectAssessment(content) {
    const lowerContent = content.toLowerCase();
    const signals = [];
    let score = 0;
    // Keyword hits (max 0.6)
    let keywordHits = 0;
    for (const kw of KEYWORDS) {
        if (lowerContent.includes(kw)) {
            keywordHits++;
            signals.push(`Keyword match: ${kw}`);
        }
    }
    score += Math.min(0.6, (keywordHits / KEYWORDS.length) * 1.5);
    // Structural hits (max 0.4)
    if (/task\\s+\\d+/i.test(lowerContent)) {
        score += 0.15;
        signals.push("Numbered task lists detected");
    }
    if (/\\d+%/.test(lowerContent)) {
        score += 0.1;
        signals.push("Percentage breakdowns detected");
    }
    if (lowerContent.includes("criteria") && (lowerContent.includes("distinction") || lowerContent.includes("fail"))) {
        score += 0.15;
        signals.push("Criteria tables/rubrics detected");
    }
    const confidence = Math.min(1.0, score);
    return {
        isAssessment: confidence > 0.4,
        confidence,
        signals
    };
}
