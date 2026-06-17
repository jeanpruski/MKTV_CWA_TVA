# HubSpot Custom Workflow Action - Apply Tax Rate

Service Node.js + TypeScript qui expose une HubSpot Custom Workflow Action pour appliquer un `hs_tax_rate_group_id` a tous les line items associes a un deal.

Endpoint principal:

```text
POST /hubspot/workflow-actions/apply-tax-rate
```

Instance HubSpot cible par defaut pour ce projet: `2660877`.

Le `HUBSPOT_PORTAL_ID` est garde comme repere de deploiement. Les appels API CRM utilisent le portail associe au `HUBSPOT_PRIVATE_APP_TOKEN`; le code ne force pas un portal ID dans les URLs HubSpot.

## Mapping TVA

| Option workflow | Cle stable | hs_tax_rate_group_id |
| --- | --- | --- |
| TVA 0% | `VAT_0` | `117639290` |
| TVA 3% | `VAT_3` | `117639291` |
| TVA 8.5% | `VAT_8_5` | `117706428` |
| TVA 17% | `VAT_17` | `117639292` |
| TVA 20% | `VAT_20` | `117639303` |
| TVA 21% | `VAT_21` | `117706425` |

## 1. Creer le Private App Token HubSpot

Dans HubSpot:

1. Aller dans `Settings > Integrations > Private Apps`.
2. Creer une private app dediee a cette action.
3. Ajouter les scopes CRM necessaires:
   - `crm.objects.deals.read`
   - `crm.objects.line_items.read`
   - `crm.objects.line_items.write`
4. Creer le token et le stocker dans `.env` sous `HUBSPOT_PRIVATE_APP_TOKEN`.

Ne pas utiliser de legacy API key. Le service envoie toujours le token avec `Authorization: Bearer ...` et ne le logge jamais.

## 2. Lancer le serveur localement

```bash
npm install
cp .env.example .env
```

Modifier `.env`:

```env
PORT=3000
HUBSPOT_PORTAL_ID=2660877
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
HUBSPOT_APP_ID=123456
ACTION_BASE_URL=https://YOUR_PUBLIC_DOMAIN
NODE_ENV=development
```

Puis lancer:

```bash
npm run dev
```

Verifier:

```bash
curl http://localhost:3000/health
```

## 3. Exposer le serveur avec ngrok

```bash
ngrok http 3000
```

Recuperer l'URL publique HTTPS, par exemple:

```text
https://abc123.ngrok-free.app
```

L'`actionUrl` HubSpot devient:

```text
https://abc123.ngrok-free.app/hubspot/workflow-actions/apply-tax-rate
```

## 3 bis. Deployer sur une URL publique de production

Le projet contient:

- `Dockerfile` pour construire le service Node.js.
- `render.yaml` pour creer un web service Docker depuis GitHub.

Variables a configurer dans l'hebergeur:

```env
NODE_ENV=production
HUBSPOT_PORTAL_ID=2660877
HUBSPOT_PRIVATE_APP_TOKEN=pat-...
```

Une fois le service deploye, verifier:

```bash
curl https://your-service.example.com/health
```

## 4. Creer la custom action via l'API HubSpot

Le compte HubSpot vise par defaut pour ce projet est `2660877`. Avant de deployer, verifier que le token et/ou le CLI HubSpot pointent bien vers ce portail.
`HUBSPOT_APP_ID` correspond a l'app HubSpot qui portera la Custom Workflow Action. Ce n'est pas le portal ID.

Le fichier d'exemple est disponible ici:

```text
examples/custom-workflow-action-definition.json
```

Remplacer `https://YOUR_PUBLIC_DOMAIN` par l'URL publique ngrok ou l'URL de production.

Ou generer un fichier pret a envoyer depuis `ACTION_BASE_URL`:

```bash
ACTION_BASE_URL=https://your-service.onrender.com npm run cwa:prepare
```

Creer ensuite l'action avec le script Node:

```bash
npm run cwa:create
```

Equivalent curl:

```bash
curl --request POST \
  --url "https://api.hubapi.com/automation/v4/actions/$HUBSPOT_APP_ID" \
  --header "Authorization: Bearer $HUBSPOT_PRIVATE_APP_TOKEN" \
  --header "Content-Type: application/json" \
  --data @generated/custom-workflow-action-definition.json
```

Notes:

- `objectTypes` cible les deals avec l'ID d'objet HubSpot `0-3`. Si l'API de creation de l'action retourne une erreur de validation sur ce champ, remplacer temporairement par `DEAL` et relancer la creation.
- Le champ `tax_rate_key` est un dropdown statique avec les valeurs `VAT_0`, `VAT_3`, `VAT_8_5`, `VAT_17`, `VAT_20`, `VAT_21`.
- L'interface de l'action n'affiche que le dropdown TVA. L'ID du deal est recupere automatiquement via `object.objectId`; le backend accepte aussi `inputFields.hs_object_id` si vous decidez de le mapper explicitement.

Si vous utilisez le HubSpot CLI, authentifier d'abord l'instance puis creer un override local pour ce projet:

```bash
hs accounts auth --account 2660877
hs accounts create-override 2660877
```

L'override local cree un fichier `.hsaccount` dans le dossier courant et evite de changer le compte par defaut global des autres projets.
Au moment du dernier audit local, `2660877` n'etait pas encore present dans `hs accounts list`; il faut donc l'authentifier avant de pouvoir le choisir comme default/override.

## 5. Tester dans un workflow Deal

1. Creer ou modifier un workflow base sur les deals.
2. Ajouter la custom action `Appliquer la TVA aux line items du deal`.
3. Choisir une TVA dans le dropdown.
4. Enroller un deal qui possede au moins un line item.
5. Verifier les outputs:
   - `status`
   - `selected_tax_rate`
   - `tax_rate_group_id`
   - `updated_count`
   - `error_count`
   - `updated_ids`
   - `error_ids`
   - `message`

## 6. Exemple curl de test local

Le test local appelle le service avec un payload similaire a HubSpot:

```bash
curl --request POST \
  --url "http://localhost:3000/hubspot/workflow-actions/apply-tax-rate" \
  --header "Content-Type: application/json" \
  --data @examples/hubspot-payload-vat-20.json
```

Exemple de reponse:

```json
{
  "outputFields": {
    "status": "success",
    "selected_tax_rate": "TVA 20%",
    "tax_rate_group_id": "117639303",
    "updated_count": 3,
    "error_count": 0,
    "updated_ids": "111,222,333",
    "error_ids": "",
    "message": "3 line item(s) mis a jour avec TVA 20%."
  }
}
```

## 7. Limites et points d'attention en production

- Utiliser HTTPS uniquement pour `actionUrl`.
- Le projet inclut un `Dockerfile` et un `render.yaml` pour un deploiement web service Docker, par exemple sur Render.
- Stocker le token dans un secret manager, pas dans le code ni dans Git.
- Prevoir une strategie de retries si HubSpot retourne des erreurs temporaires ou des rate limits.
- Les mises a jour sont executees sequentiellement pour limiter la pression sur l'API HubSpot.
- Les erreurs partielles retournent `partial_success` avec la liste des line item IDs en echec.
- Si aucun line item n'est associe au deal, l'action retourne `success` avec `updated_count: 0`.
- Si toutes les mises a jour echouent, l'action retourne `status: "error"` dans `outputFields`.
- Les reponses metier utilisent HTTP 200 pour que les outputs restent exploitables dans le workflow. Adaptez ce comportement si vous voulez forcer les retries HubSpot sur certaines erreurs.
- Limiter l'acces reseau au serveur avec une couche d'authentification, une allowlist IP ou une validation de signature si votre contexte le demande.

## Scripts

```bash
npm run dev       # serveur local en watch mode
npm run build     # compilation TypeScript dans dist/
npm run start     # execution de dist/server.js
npm run typecheck # verification TypeScript sans emission
```
