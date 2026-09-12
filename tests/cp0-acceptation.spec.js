import { describe, it } from 'node:test';
import {
  persona, template, texte, caracteres, estEmoji, verifier,
} from '../scripts/lib/acceptance-data.js';
describe('acceptation CP0', () => {
  it('le nom fait entre 2 et 20 caractères', () => {
    const nom = texte(persona.name).trim();
    const n = caracteres(nom);
    const msg = `Ton nom fait ${n} caractère${n > 1 ? 's' : ''}.`;
    verifier(n >= 2 && n <= 20, msg + ' Choisis entre 2 et 20 caractères.');
  });
  it('l’avatar est un seul emoji', () => {
    const image = texte(persona.avatar);
    const sansEspace = image === image.trim();
    const seul = estEmoji(image) && caracteres(image) === 1;
    verifier(sansEspace && seul, `Change ton avatar « ${image} » : mets un seul emoji sans espace.`);
  });
  it('le prompt système fait au moins 80 caractères', () => {
    const consigne = texte(persona.systemPrompt).trim();
    const n = caracteres(consigne);
    verifier(n >= 80, `Ton prompt fait ${n} caractères : écris au moins 80 caractères.`);
  });
  it('le message de bienvenue contient le nom', () => {
    const nom = texte(persona.name).trim();
    const accueil = texte(persona.welcomeMessage);
    const ok = accueil.trim() !== '' && nom !== '' && accueil.includes(nom);
    verifier(ok, `Change ton accueil « ${accueil} » : il doit contenir « ${nom} ».`);
  });
  it('la persona est différente du modèle', () => {
    const gabarit = template ?? {};
    const memeNom = persona.name === gabarit.name && persona.avatar === gabarit.avatar;
    const memeTexte = persona.systemPrompt === gabarit.systemPrompt && persona.welcomeMessage === gabarit.welcomeMessage;
    verifier(!(memeNom && memeTexte), 'Change au moins un champ : ta persona copie encore le modèle.');
  });
});
