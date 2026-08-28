# Setor XI — Catálogo de Camisas

Vitrine visual (sem carrinho/checkout) para a marca **Setor XI** — _Vista o Jogo_.

HTML/CSS/JS puro, sem build e sem dependências. Tema escuro na paleta
preto / branco / verde.

## Como abrir

Dê dois cliques em `index.html` (abre direto no navegador) ou arraste o
arquivo para uma janela do Chrome/Edge/Firefox.

## Arquivos

| Arquivo       | Função                                                          |
|---------------|---------------------------------------------------------------|
| `index.html`  | Estrutura da página                                           |
| `styles.css`  | Estilo e responsividade (variáveis de cor no topo, em `:root`) |
| `products.js` | **Dados dos produtos** — edite só aqui para mudar o catálogo   |
| `app.js`      | Monta os filtros e a grade a partir de `products.js`           |
| `img/`        | Logo da marca (`logo-reverse.png` = versão clara p/ fundo escuro; `logo.png` = versão original p/ fundo claro) |
| `fotos/`      | Fotos dos produtos (JPG ~900 px). Referenciadas pelo campo `image` em `products.js` |

## Editar os produtos

Abra `products.js` e altere o array `window.SETOR_XI_PRODUCTS`. Cada item:

```js
{
  id: "selecao-i",                   // identificador único
  name: "Seleção Nacional I",        // nome exibido
  category: "Camisas de Seleção",    // vira filtro automaticamente
  price: 170,                        // número em reais (sem "R$" nem vírgula); null = "Entrar em contato"
  number: "10",                      // número no placeholder da marca (opcional)
  image: null,                       // "fotos/selecao-i.jpg" para foto real; null usa o placeholder
  badge: "Novo"                      // selo no card (opcional; use null p/ nenhum)
}
```

- **Adicionar/remover camisas:** acrescente ou apague objetos do array.
- **Nova categoria:** basta usar um `category` novo — o filtro aparece sozinho.
- **Foto real:** coloque a imagem numa pasta (ex.: `fotos/`) e aponte `image`
  para o caminho. Sem `image`, o card usa o placeholder com as listras
  diagonais da marca.

## Cores

Definidas em `styles.css`, em `:root`:

```css
--black:  #0a0a0a;   /* fundo  */
--white:  #fafafa;   /* texto  */
--accent: #1fdd6d;   /* verde do logo */
```
