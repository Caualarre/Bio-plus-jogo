const ctaSobre = document.getElementById("ctaSobre");
const ctaFeedback = document.getElementById("ctaFeedback");

const form = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

const GITHUB_USER = "Caualarre"; // <-- coloque seu usuário aqui

ctaSobre.addEventListener("click", () => {
  document
    .getElementById("sobre")
    .scrollIntoView({ behavior: "smooth", block: "start" });

  ctaFeedback.textContent =
    "Obrigado pelo interesse. A seção Sobre está logo abaixo.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const nome = document.getElementById("nome").value.trim();

  formStatus.textContent = `Mensagem enviada com sucesso, ${nome || "visitante"}!`;

  form.reset();
});

async function carregarGithub() {
  try {
    // =============================
    // Perfil
    // =============================

    const profileResponse = await fetch(
      `https://api.github.com/users/${GITHUB_USER}`,
    );

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

    // =============================
    // Repositórios
    // =============================

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
