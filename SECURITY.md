# Segurança — Setor XI

## Como o catálogo fica protegido contra alteração

Este é um site **estático**. O que as pessoas veem no navegador é uma cópia —
ninguém consegue alterar o site "por fora". A única forma de mudar o catálogo
(código ou fotos) é ter **acesso de escrita a este repositório**, porque o site
publicado (GitHub Pages) é gerado a partir da branch `main`.

Ou seja: **a segurança do catálogo = o controle de acesso do repositório + as
contas do GitHub protegidas.** Não é algo programado dentro do site.

## Configuração recomendada no GitHub

| Item | Onde | Por quê |
|---|---|---|
| Repositório **privado** | Settings → General → Danger Zone → Change visibility | Só quem é convidado enxerga o código e as fotos |
| **2FA** obrigatório | github.com/settings/security (cada conta) | Impede acesso mesmo se a senha vazar — é a proteção que mais importa |
| **Branch protection** em `main` | Settings → Branches → Add rule | Ninguém dá push direto: só via Pull Request aprovado. Sem force-push, sem apagar a branch |
| Revisão do **CODEOWNERS** | (na regra de branch acima) | Toda mudança precisa da sua aprovação — ver `.github/CODEOWNERS` |
| Colaboradores com papel **Write** | Settings → Collaborators | Só adicione o sócio, individualmente. Não use "Admin" |
| **Secret scanning** e **Dependabot** | Settings → Code security | Grátis, liga com um clique |

## Camada extra (opcional, quando quiser)

- **Content-Security-Policy** no `index.html` — bloqueia qualquer script
  injetado, caso a hospedagem seja comprometida.
- **Commits assinados** obrigatórios na regra de branch.
- Hospedar num serviço com proteção por senha (Netlify/Cloudflare) se o
  catálogo precisar deixar de ser público.

## Reportar um problema de segurança

Fale com **@setorxi** no Instagram ou pelo WhatsApp **(45) 99127-1005**.
Não abra uma issue pública.
