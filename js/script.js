const ctaSobre = document.getElementById("ctaSobre");
const ctaFeedback = document.getElementById("ctaFeedback");

const form = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

const GITHUB_USER = "Caualarre"; // Coloque seu usuário aqui para trocar os dados do GitHub exibidos na página

ctaSobre.addEventListener("click", () => {
  document
    .getElementById("sobre")
    .scrollIntoView({ behavior: "smooth", block: "start" });

  ctaFeedback.textContent =
    "Obrigado pelo interesse. A seção Sobre está logo abaixo.";
});
// Adiciona um evento para o envio do formulário
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const botao = form.querySelector("button");

  botao.disabled = true;
  botao.textContent = "Enviando...";
  formStatus.textContent = "";
  // Envia os dados do formulário para o FormSubmit para o email especificado (que está protegido pelo código de hash)
  try {
    const resposta = await fetch(
      "https://formsubmit.co/ajax/a27234b62032fe31688bc17f9cf68391",
      {
        method: "POST",
        body: new FormData(form),
      },
    );

    const dados = await resposta.json();

    if (dados.success === "true" || dados.success === true) {
      const nome = document.getElementById("nome").value.trim();

      formStatus.textContent = `Mensagem enviada com sucesso, ${nome || "visitante"}!`;

      form.reset();
    } else {
      formStatus.textContent = "Não foi possível enviar a mensagem.";
    }
  } catch (erro) {
    formStatus.textContent =
      "Erro ao enviar. Tente novamente em alguns instantes.";

    console.error(erro);
  } finally {
    botao.disabled = false;
    botao.textContent = "Enviar mensagem";
  }
});
// Carrega e mostra os dados do GitHub do usuário especificado o qual pode ser substituido por outro usuário mudando a constante GITHUB_USER no início do arquivo e mostra os repositórios também.
async function carregarGithub() {
  try {
    //Perfil do usuário
    const profileResponse = await fetch(
      `https://api.github.com/users/${GITHUB_USER}`,
    );
    // Caso o usuário não seja encontrado, lança um erro
    if (!profileResponse.ok) {
      throw new Error("Usuário não encontrado.");
    }

    const profile = await profileResponse.json();

    document.getElementById("githubAvatar").src = profile.avatar_url;

    document.getElementById("githubName").textContent =
      profile.name || profile.login;

    document.getElementById("githubBio").textContent =
      profile.bio || "Sem biografia.";

    document.getElementById("githubRepos").textContent = profile.public_repos;

    document.getElementById("githubFollowers").textContent = profile.followers;

    document.getElementById("githubLocation").textContent =
      profile.location || "Não informado";

    document.getElementById("githubLink").href = profile.html_url;

    // Repositórios
    const reposResponse = await fetch(
      `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated`,
    );

    if (!reposResponse.ok) {
      throw new Error("Erro ao buscar repositórios.");
    }

    const repos = await reposResponse.json();

    const container = document.getElementById("githubProjects");

    container.innerHTML = "";

    repos
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 6)
      .forEach((repo) => {
        const language = repo.language || "Não informada";

        const description = repo.description || "Sem descrição.";

        container.innerHTML += `
          <article class="project-card">

            <div>
              <p class="project-kicker">${language}</p>

              <h3>${repo.name}</h3>

              <p>${description}</p>

              <p>
                ⭐ ${repo.stargazers_count}
                • 🍴 ${repo.forks_count}
              </p>
            </div>

            <div class="project-actions">
              <a
                class="btn btn-primary"
                href="${repo.html_url}"
                target="_blank"
              >
                Abrir repositório
              </a>
            </div>

          </article>
        `;
      });
  } catch (error) {
    console.error(error);

    document.getElementById("githubProjects").innerHTML = `
      <div class="project-card">
        Não foi possível carregar os repositórios.
      </div>
    `;
  }
}

carregarGithub();
