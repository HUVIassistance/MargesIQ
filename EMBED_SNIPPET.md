# Marges IQ — Intégration iframe (embed)

Intégrez le calculateur Marges IQ sur votre site via une simple iframe. Les intégrations pointent **toujours** vers `https://marges.huvioptimisation.com/` — ne copiez jamais le code de l'outil : le calcul et les mises à jour restent sur le domaine officiel.

## Paramètres d'URL

| Paramètre | Valeurs | Effet |
|---|---|---|
| `embed` | `1` | Masque le chrome (header + footer) pour une intégration iframe propre |
| `mode` | `quick` · `standard` · `pro` | Ouvre directement une nouvelle simulation dans le mode choisi |

Les paramètres se combinent : `?embed=1&mode=quick`.

## Modes disponibles

- `quick` — estimation rapide (< 60 s)
- `standard` — précision opérationnelle fine (recommandé)
- `pro` — rentabilité stratégique complète

## Snippets prêts à copier

### Embed (cas le plus fréquent) — sans mode

L'utilisateur arrive sur le dashboard et choisit lui-même son mode. À privilégier par défaut.

```html
<iframe
  src="https://marges.huvioptimisation.com/?embed=1"
  width="100%"
  height="850"
  style="border:0;"
  loading="lazy"
  title="Marges IQ — Calculateur de marge"
></iframe>
```

### Embed + deep-link vers un mode précis

Ouvre directement une nouvelle simulation dans le mode choisi.

```html
<!-- Mode Quick -->
<iframe
  src="https://marges.huvioptimisation.com/?embed=1&mode=quick"
  width="100%"
  height="850"
  style="border:0;"
  loading="lazy"
  title="Marges IQ — Calculateur de marge (mode rapide)"
></iframe>

<!-- Mode Standard -->
<iframe
  src="https://marges.huvioptimisation.com/?embed=1&mode=standard"
  width="100%"
  height="850"
  style="border:0;"
  loading="lazy"
  title="Marges IQ — Calculateur de marge (mode standard)"
></iframe>

<!-- Mode Pro -->
<iframe
  src="https://marges.huvioptimisation.com/?embed=1&mode=pro"
  width="100%"
  height="850"
  style="border:0;"
  loading="lazy"
  title="Marges IQ — Calculateur de marge (mode pro)"
></iframe>
```

### Intégration complète (header/footer de l'outil visibles)

Utile uniquement si vous souhaitez afficher le chrome complet de l'outil.

```html
<iframe
  src="https://marges.huvioptimisation.com/"
  width="100%"
  height="900"
  style="border:0;"
  loading="lazy"
  title="Marges IQ — Calculateur de marge"
></iframe>
```

## Hauteurs recommandées

| Contexte | Hauteur conseillée |
|---|---|
| Dashboard d'accueil | `700 px` |
| Formulaire (quick / standard) | `900 px` |
| Formulaire (pro) + écran résultat | `1000 px` |
| Responsive mobile | `100%` + `min-height: 700px` |

Astuce : préférez `width="100%"` et ajustez `height` à la section concernée (le formulaire multi-étapes est plus haut que le dashboard).

## Note sur la confidentialité

Les données saisies sont sauvegardées **localement sur l'appareil de l'utilisateur** (localStorage). Une intégration iframe ne partage pas de données entre sites : chaque visiteur repart d'un historique vierge, ce qui est voulu pour la confidentialité.
