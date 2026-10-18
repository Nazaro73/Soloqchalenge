# SoloQ Challenge

Classement d'un SoloQ challenge League of Legends entre potes (serveur EUW).

- Rang, LP, winrate et nombre de parties en classée solo
- Points = LP cumulés depuis Fer IV 0 LP (100 LP par division, Master+ = 2800 + LP), plus le handicap de chaque joueur
- KDA moyen sur les 10 dernières parties classées solo
- Statut « en game » et page de la partie en cours (champions, sorts, runes, rangs)

## Lancer le projet

```bash
npm install
cp .env.example .env   # puis mettre sa clé Riot dans RIOT_API_KEY
npm run dev            # http://localhost:5173
```

Clé API : [developer.riotgames.com](https://developer.riotgames.com). Une clé de développement expire après 24 h.

## Configuration

Joueurs et handicaps : `server/config.js`.

## Production

```bash
npm run build
npm start              # sert l'API et le site sur le port 3001
```
