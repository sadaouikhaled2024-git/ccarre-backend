/* Dictionnaire de mots/ termes suspects associés à des arnaques */

const SCAM_KEYWORDS = {
  communication_externe: ['whatsapp', 'telegram', 'viber', 'signal', 'skype', '+33', '+1', '06', '07'],
  urgence: ['urgent', 'dépêchez-vous', 'immédiat', 'vite', 'asap', 'rapidement'],
  paiement_externe: [
    'virement',
    'paypal',
    'crypto',
    'bitcoin',
    'ethereum',
    'amazon',
    'carte',
    'paiement-direct',
    'payer d\'abord',
  ],
  prix_anormal: ['gratuit', 'trop bon', 'incroyable', 'promo', 'solde', 'occasion rare'],
};

/* ───────── Fonction principale de détection ───────── */

export interface ScamDetectionResult {
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
  detectedKeywords: string[];
}

/**
 * Analyse un texte pour détecter des termes suspects
 * @param text - Texte à analyser (titre, description, etc)
 * @returns Résultat de détection avec raisons et mots trouvés
 */
export function detectScamKeywords(text: string): ScamDetectionResult {
  const normalizedText = text.toLowerCase();
  const reasons: string[] = [];
  const detectedKeywords: string[] = [];
  let riskScore = 0;

  // Vérifier chaque catégorie de mots suspects
  Object.entries(SCAM_KEYWORDS).forEach(([category, keywords]) => {
    keywords.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(normalizedText)) {
        detectedKeywords.push(keyword);
        riskScore += 15; // +15 points par mot détecté

        if (!reasons.includes(`Détecté : ${category}`)) {
          reasons.push(`Détecté : ${category.replace(/_/g, ' ')}`);
        }
      }
    });
  });

  return {
    isSuspicious: riskScore >= 30,
    riskScore,
    reasons,
    detectedKeywords,
  };
}

/**
 * Détecte les numéros de téléphone dans le texte
 */
export function detectPhoneNumbers(text: string): { hasPhoneNumbers: boolean; numbers: string[] } {
  const phoneRegex = /(?:\+33|0)[1-9](?:[0-9]{8})/g;
  const numbers = text.match(phoneRegex) || [];
  return {
    hasPhoneNumbers: numbers.length > 0,
    numbers,
  };
}

/**
 * Détecte les emails dans le texte
 */
export function detectEmails(text: string): { hasEmails: boolean; emails: string[] } {
  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
  const emails = text.match(emailRegex) || [];
  return {
    hasEmails: emails.length > 0,
    emails,
  };
}

/**
 * Détecte les URLs/liens externes
 */
export function detectExternalLinks(text: string): { hasLinks: boolean; links: string[] } {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const links = text.match(urlRegex) || [];
  return {
    hasLinks: links.length > 0,
    links,
  };
}

/**
 * Analyse complète d'un contenu (annonce ou message)
 * Retourne un score de risque global
 */
export interface FullSecurityAnalysis extends ScamDetectionResult {
  hasPhoneNumbers: boolean;
  phoneNumbers: string[];
  hasEmails: boolean;
  emails: string[];
  hasExternalLinks: boolean;
  externalLinks: string[];
}

export function performSecurityAnalysis(
  title: string,
  description: string,
): FullSecurityAnalysis {
  const combinedText = `${title} ${description}`;

  // Détection mots clés
  const keywordAnalysis = detectScamKeywords(combinedText);

  // Détection numéros
  const phoneAnalysis = detectPhoneNumbers(combinedText);

  // Détection emails
  const emailAnalysis = detectEmails(combinedText);

  // Détection links
  const linkAnalysis = detectExternalLinks(combinedText);

  // Augmenter le score de risque si infos de contact détectées
  let finalRiskScore = keywordAnalysis.riskScore;

  if (phoneAnalysis.hasPhoneNumbers) {
    finalRiskScore += 30;
    keywordAnalysis.reasons.push('Numéros de téléphone détectés');
  }

  if (emailAnalysis.hasEmails) {
    finalRiskScore += 20;
    keywordAnalysis.reasons.push('Emails détectés');
  }

  if (linkAnalysis.hasLinks) {
    finalRiskScore += 25;
    keywordAnalysis.reasons.push('Liens externes détectés');
  }

  return {
    ...keywordAnalysis,
    riskScore: Math.min(finalRiskScore, 100), // Cap à 100
    isSuspicious: finalRiskScore >= 30,
    hasPhoneNumbers: phoneAnalysis.hasPhoneNumbers,
    phoneNumbers: phoneAnalysis.numbers,
    hasEmails: emailAnalysis.hasEmails,
    emails: emailAnalysis.emails,
    hasExternalLinks: linkAnalysis.hasLinks,
    externalLinks: linkAnalysis.links,
  };
}

/**
 * Calcule le score de risque final d'une annonce
 * Combine plusieurs facteurs
 */
export function calculateAnnonceRiskScore(params: {
  keywordRiskScore: number;
  reportCount: number;
  ownerRiskScore: number;
  isRecentAccount?: boolean;
}): {
  finalRiskScore: number;
  isSuspicious: boolean;
} {
  let score = 0;

  // Mots suspects
  score += params.keywordRiskScore;

  // Nombre de signalements
  score += Math.min(params.reportCount * 10, 40);

  // Score de risque du propriétaire
  score += params.ownerRiskScore * 0.5;

  // Compte récent
  if (params.isRecentAccount) {
    score += 15;
  }

  const finalScore = Math.min(score, 100);

  return {
    finalRiskScore: finalScore,
    isSuspicious: finalScore >= 40,
  };
}
