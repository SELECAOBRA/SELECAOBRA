# Calculadora web de pontos
Site estático responsivo, sem backend. Fórmula: `a*x² + b*x + c`, limitada entre 1.000 e 15.000 pontos por pista.

## Publicar no GitHub Pages
1. Envie o conteúdo desta pasta para a raiz de um repositório GitHub. O `index.html` deve aparecer na página inicial do repositório.
2. No repositório, acesse **Settings > Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, pasta `/ (root)`, e salve.

## Atualizar os eventos
Edite `config/events.json`. A configuração aceita um ou dois eventos, cada um com quatro ou cinco pistas. Tipos válidos: `time` e `distance`. Altere também `updatedAt`.

O segundo evento incluído é um placeholder porque a planilha fornecida contém somente o evento After-Hours Rider.

## Teste local
Na pasta do site, execute `python3 -m http.server 8000` e abra `http://localhost:8000`. Não abra `index.html` diretamente via `file://`, pois o navegador pode bloquear o carregamento do JSON.
