const dark = document.getElementById("troca");

// 1. Ao carregar a página, verifica se o usuário já tinha escolhido o modo escuro antes
if (localStorage.getItem("tema") === "dark") {
    document.body.classList.add("dark");
}

// 2. Escuta o clique no botão para alternar o tema e salvar a preferência
dark.addEventListener("click", function() {
    document.body.classList.toggle("dark");
    
    // Se a classe "dark" foi adicionada, salva no localStorage. Se foi removida, tira de lá.
    if (document.body.classList.contains("dark")) {
        localStorage.setItem("tema", "dark");
    } else {
        localStorage.removeItem("tema"); // ou localStorage.setItem("tema", "light");
    }
});


const p1 = document.getElementById("paragrafo1");
    const p2 = document.getElementById("paragrafo2");

    const texto1 = "O melhor sabor,";
    const texto2 = "no conforto da sua casa!";

    let index1 = 0;
    let index2 = 0;
    
    const velDigitar = 100; 
    const velApagar = 50;   
    const pausaExibicao = 2500; 
       
    function digitarP1() {
        if (index1 < texto1.length) {
            p1.textContent += texto1.charAt(index1);
            index1++;
            setTimeout(digitarP1, velDigitar);
        } else {
            setTimeout(digitarP2, 200); 
        }
    }   
    function digitarP2() {
        if (index2 < texto2.length) {
            p2.textContent += texto2.charAt(index2);
            index2++;
            setTimeout(digitarP2, velDigitar);
        } else {
           
            setTimeout(apagarP2, pausaExibicao);
        }
    }   
    function apagarP2() {
        if (index2 > 0) {
            p2.textContent = texto2.substring(0, index2 - 1);
            index2--;
            setTimeout(apagarP2, velApagar);
        } else {
            setTimeout(apagarP1, 100); 
        }
    }
    function apagarP1() {
        if (index1 > 0) {
            p1.textContent = texto1.substring(0, index1 - 1);
            index1--;
            setTimeout(apagarP1, velApagar);
        } else {  
            setTimeout(digitarP1, 500); 
        }
    }  
    if (p1) p1.textContent = "";
    if (p2) p2.textContent = "";
    if (p1 && p2) window.onload = digitarP1;


/* ===== PÁGINA DE PEDIDOS ===== */

// Camada de dados dos pedidos.
// Enquanto não existe banco, os pedidos ficam no localStorage do navegador.
// Quando o banco estiver pronto, troque o corpo de cada método pela chamada à API (fetch),
// mantendo os mesmos nomes. O restante da página não precisa mudar.
const PedidosService = {
    chave: "pedidos",

    async listar() {
        // Com banco: return (await fetch("/api/pedidos")).json();
        return JSON.parse(localStorage.getItem(this.chave) || "[]");
    },

    async salvar(pedido) {
        // Com banco: fazer POST em /api/pedidos com o pedido no corpo
        const pedidos = await this.listar();
        pedidos.push(pedido);
        localStorage.setItem(this.chave, JSON.stringify(pedidos));
        return pedido;
    }
};

// Chame esta função ao finalizar uma compra. Exemplo:
// criarPedido([{ nome: "Combo Titã", quantidade: 2, preco: 40 }], 80);
async function criarPedido(itens, total) {
    const pedidos = await PedidosService.listar();
    const sessao = SessaoService.atual();
    const pedido = {
        id: pedidos.reduce((maior, p) => Math.max(maior, p.id), 0) + 1,
        usuarioEmail: sessao ? sessao.email : null,
        data: new Date().toISOString(),
        itens: itens,
        total: total,
        status: "andamento"
    };
    return PedidosService.salvar(pedido);
}

const STATUS_PEDIDO = {
    andamento: { texto: "EM ANDAMENTO", classe: "status-andamento" },
    entregue: { texto: "ENTREGUE", classe: "status-entregue" },
    cancelado: { texto: "CANCELADO", classe: "status-cancelado" }
};

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso) {
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    const area = document.getElementById("lista-cards");
    if (!area) return; // não está na página de pedidos

    const botoesFiltro = document.querySelectorAll(".btn-filtro");
    const valoresResumo = document.querySelectorAll(".resumo-valor");
    const msgVazia = document.querySelector(".mensagem-vazia");
    const mapaFiltro = {
        "TODOS": "todos",
        "ENTREGUES": "entregue",
        "EM ANDAMENTO": "andamento",
        "CANCELADOS": "cancelado"
    };

    // Cada conta vê só os próprios pedidos
    const sessaoAtual = SessaoService.atual();
    const emailLogado = sessaoAtual ? sessaoAtual.email : null;
    let pedidos = (await PedidosService.listar()).filter(p => emailLogado && p.usuarioEmail === emailLogado);
    let filtroAtual = "todos";

    // Pedidos mais recentes primeiro, aplicando o filtro escolhido
    function pedidosFiltrados() {
        const ordenados = [...pedidos].sort((a, b) => new Date(b.data) - new Date(a.data));
        return filtroAtual === "todos" ? ordenados : ordenados.filter(p => p.status === filtroAtual);
    }

    function atualizarResumo() {
        const entregues = pedidos.filter(p => p.status === "entregue");
        const gasto = entregues.reduce((soma, p) => soma + Number(p.total), 0);
        valoresResumo[0].textContent = pedidos.length;
        valoresResumo[1].textContent = entregues.length;
        valoresResumo[2].textContent = formatarMoeda(gasto);
    }

    // Modal com os detalhes do pedido
    const modal = document.createElement("div");
    modal.className = "modal-pedido oculto";
    modal.innerHTML = `
        <div class="modal-conteudo">
            <button class="modal-fechar" aria-label="Fechar">&times;</button>
            <h3 class="modal-titulo"></h3>
            <span class="status modal-status"></span>
            <p class="modal-data"></p>
            <ul class="modal-itens"></ul>
            <p class="modal-total"></p>
        </div>`;
    document.body.appendChild(modal);

    function fecharModal() {
        modal.classList.add("oculto");
    }

    function abrirDetalhes(pedido) {
        const st = STATUS_PEDIDO[pedido.status] || STATUS_PEDIDO.andamento;

        modal.querySelector(".modal-titulo").textContent = `Pedido #${pedido.id}`;
        const statusEl = modal.querySelector(".modal-status");
        statusEl.textContent = st.texto;
        statusEl.className = `status ${st.classe} modal-status`;
        modal.querySelector(".modal-data").textContent = `Realizado em ${formatarData(pedido.data)}`;

        const lista = modal.querySelector(".modal-itens");
        lista.innerHTML = "";
        pedido.itens.forEach(function (item) {
            const li = document.createElement("li");
            li.textContent = `${item.quantidade}x ${item.nome}`;
            lista.appendChild(li);
        });

        modal.querySelector(".modal-total").textContent = `Total: ${formatarMoeda(pedido.total)}`;
        modal.classList.remove("oculto");
    }

    modal.querySelector(".modal-fechar").addEventListener("click", fecharModal);
    modal.addEventListener("click", function (e) {
        if (e.target === modal) fecharModal();
    });
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") fecharModal();
    });

    // Monta o card de um pedido usando as mesmas classes do CSS
    function criarCard(pedido) {
        const st = STATUS_PEDIDO[pedido.status] || STATUS_PEDIDO.andamento;
        const card = document.createElement("article");
        card.className = "card-pedido";
        card.innerHTML = `
            <div class="pedido-topo">
                <h3 class="pedido-numero">Pedido #${pedido.id}</h3>
                <span class="status ${st.classe}">${st.texto}</span>
            </div>
            <p class="pedido-data">Realizado em ${formatarData(pedido.data)}</p>
            <ul class="pedido-itens"></ul>
            <div class="pedido-rodape">
                <span class="pedido-total">Total: ${formatarMoeda(pedido.total)}</span>
                <button class="btn-detalhes">VER DETALHES</button>
            </div>`;

        const lista = card.querySelector(".pedido-itens");
        pedido.itens.forEach(function (item) {
            const li = document.createElement("li");
            li.textContent = `${item.quantidade}x ${item.nome}`;
            lista.appendChild(li);
        });

        card.querySelector(".btn-detalhes").addEventListener("click", function () {
            abrirDetalhes(pedido);
        });
        return card;
    }

    function render() {
        const lista = pedidosFiltrados();
        area.innerHTML = "";
        lista.forEach(function (pedido) {
            area.appendChild(criarCard(pedido));
        });

        msgVazia.textContent = pedidos.length === 0
            ? "Você ainda não fez nenhum pedido."
            : "Nenhum pedido encontrado nesta categoria.";
        msgVazia.classList.toggle("oculto", lista.length > 0);

        atualizarResumo();
    }

    botoesFiltro.forEach(function (btn) {
        btn.addEventListener("click", function () {
            botoesFiltro.forEach(b => b.classList.remove("btn-filtro-ativo"));
            btn.classList.add("btn-filtro-ativo");
            filtroAtual = mapaFiltro[btn.textContent.trim()];
            render();
        });
    });

    render();
});

/* ===== CARRINHO ===== */

// Carrinho guardado no localStorage até existir o banco de dados.
const CarrinhoService = {
    chave: "carrinho",

    listar() {
        return JSON.parse(localStorage.getItem(this.chave) || "[]");
    },

    salvar(itens) {
        localStorage.setItem(this.chave, JSON.stringify(itens));
    },

    // Adiciona um produto. Se ele já estiver no carrinho, aumenta a quantidade.
    adicionar(produto) {
        const itens = this.listar();
        const existente = itens.find(i => i.nome === produto.nome && i.preco === produto.preco);
        if (existente) {
            existente.quantidade++;
        } else {
            itens.push({ nome: produto.nome, preco: produto.preco, quantidade: 1 });
        }
        this.salvar(itens);
    },

    limpar() {
        localStorage.removeItem(this.chave);
    },

    quantidadeTotal() {
        return this.listar().reduce((soma, i) => soma + i.quantidade, 0);
    }
};

// Mostra o número de itens ao lado do ícone do carrinho
function atualizarBadgeCarrinho() {
    const badge = document.getElementById("badge-carrinho");
    if (!badge) return;
    const quantidade = CarrinhoService.quantidadeTotal();
    badge.textContent = quantidade;
    badge.hidden = quantidade === 0;
}

// Converte o texto do preço em número. Ex.: "R$14,00 e 12,00" vira 14
function extrairPreco(texto) {
    const m = texto.match(/(\d+),(\d{2})/);
    return m ? parseFloat(m[1] + "." + m[2]) : 0;
}

document.addEventListener("DOMContentLoaded", function () {
    // Cria o contador no ícone do carrinho (em todas as páginas que têm o ícone)
    const svgCarrinho = document.getElementById("svg-carrinho");
    if (svgCarrinho) {
        const link = svgCarrinho.parentElement;
        link.classList.add("link-carrinho");
        const badge = document.createElement("span");
        badge.id = "badge-carrinho";
        link.appendChild(badge);
        atualizarBadgeCarrinho();
    }

    // Página de produtos: "Adicionar" põe o item no carrinho e vai para a página do carrinho
    document.querySelectorAll(".botton-add").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
            e.preventDefault();
            const card = btn.closest(".cards-di");
            const opcoes = opcoesTamanho(card);
            if (opcoes.length > 1) {
                escolherTamanho(card, opcoes);
                return;
            }
            CarrinhoService.adicionar({
                nome: card.querySelector("h3").textContent.trim(),
                preco: extrairPreco(card.querySelector("h4").textContent)
            });
            atualizarBadgeCarrinho();
        });
    });

    atualizarBadgePedidos();
    iniciarPaginaCarrinho();
});

// Número de pedidos em andamento ao lado do item PEDIDOS do menu
async function atualizarBadgePedidos() {
    const link = document.querySelector('nav a[href="pedidos.html"]');
    if (!link) return;
    let badge = document.getElementById("badge-pedidos");
    if (!badge) {
        badge = document.createElement("span");
        badge.id = "badge-pedidos";
        link.parentElement.appendChild(badge);
    }
    const sessao = SessaoService.atual();
    const pedidos = sessao ? (await PedidosService.listar()).filter(p => p.usuarioEmail === sessao.email) : [];
    const emAndamento = pedidos.filter(p => p.status === "andamento").length;
    badge.textContent = emAndamento;
    badge.hidden = emAndamento === 0;
}

// Página do carrinho (carrinho.html)
function iniciarPaginaCarrinho() {
    const lista = document.getElementById("lista-carrinho");
    if (!lista) return;

    const msgVazio = document.getElementById("msg-carrinho-vazio");
    const resumo = document.getElementById("resumo-carrinho");
    const totalEl = document.getElementById("total-carrinho");
    const btnFinalizar = document.getElementById("btn-finalizar");
    let pedidoFinalizado = false;

    function criarBotao(texto, acao) {
        const btn = document.createElement("button");
        btn.className = "qtd-btn";
        btn.dataset.acao = acao;
        btn.textContent = texto;
        return btn;
    }

    function criarItem(item, indice) {
        const card = document.createElement("article");
        card.className = "card-carrinho";
        card.dataset.indice = indice;

        const info = document.createElement("div");
        const nome = document.createElement("h3");
        nome.className = "item-nome";
        nome.textContent = item.nome;
        const unitario = document.createElement("p");
        unitario.className = "item-unitario";
        unitario.textContent = formatarMoeda(item.preco) + " cada";
        info.append(nome, unitario);

        const controles = document.createElement("div");
        controles.className = "item-controles";
        const qtd = document.createElement("span");
        qtd.className = "item-qtd";
        qtd.textContent = item.quantidade;
        controles.append(criarBotao("-", "menos"), qtd, criarBotao("+", "mais"));

        const subtotal = document.createElement("span");
        subtotal.className = "item-subtotal";
        subtotal.textContent = formatarMoeda(item.preco * item.quantidade);

        const remover = document.createElement("button");
        remover.className = "btn-remover";
        remover.dataset.acao = "remover";
        remover.textContent = "REMOVER";

        card.append(info, controles, subtotal, remover);
        return card;
    }

    function render() {
        const itens = CarrinhoService.listar();
        lista.innerHTML = "";
        itens.forEach(function (item, indice) {
            lista.appendChild(criarItem(item, indice));
        });

        msgVazio.textContent = pedidoFinalizado
            ? "Pedido realizado com sucesso! Acompanhe o status no menu PEDIDOS."
            : "Seu carrinho está vazio. Escolha seus produtos no cardápio.";
        msgVazio.classList.toggle("oculto", itens.length > 0);
        resumo.classList.toggle("oculto", itens.length === 0);

        const total = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
        totalEl.textContent = formatarMoeda(total);
        atualizarBadgeCarrinho();
    }

    // Botões de quantidade e remover (delegação de eventos)
    lista.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-acao]");
        if (!btn) return;
        const itens = CarrinhoService.listar();
        const indice = Number(btn.closest(".card-carrinho").dataset.indice);
        const acao = btn.dataset.acao;

        if (acao === "mais") {
            itens[indice].quantidade++;
        } else if (acao === "menos") {
            itens[indice].quantidade--;
            if (itens[indice].quantidade <= 0) itens.splice(indice, 1);
        } else if (acao === "remover") {
            itens.splice(indice, 1);
        }

        CarrinhoService.salvar(itens);
        render();
    });

    // Finaliza: cria o pedido, esvazia o carrinho e mostra os pedidos
    btnFinalizar.addEventListener("click", async function () {
        const itens = CarrinhoService.listar();
        if (itens.length === 0) return;

        // Só quem está cadastrado e logado pode comprar
        if (!SessaoService.atual()) {
            window.location.href = "entrar.html?voltar=carrinho.html";
            return;
        }

        const sessao = SessaoService.atual();
        const usuario = UsuarioService.listar().find(u => u.email === sessao.email);
        const cliente = {
            nome: usuario.nome,
            email: usuario.email,
            telefone: usuario.telefone,
            endereco: usuario.endereco || {}
        };
        const total = itens.reduce((soma, i) => soma + i.preco * i.quantidade, 0);
        const pedido = await criarPedido(
            itens.map(i => ({ nome: i.nome, quantidade: i.quantidade, preco: i.preco })),
            Math.round(total * 100) / 100
        );
        baixarCarrinhoJson(itens, cliente, pedido.id);
        CarrinhoService.limpar();
        pedidoFinalizado = true;
        render();
        atualizarBadgePedidos();
    });

    render();
}

/* ===== CADASTRO ===== */

// Usuários guardados no localStorage até existir o banco de dados.
// Quando o banco estiver pronto, troque o corpo de listar() e salvar() por chamadas à API.
const UsuarioService = {
    chave: "usuarios",

    listar() {
        return JSON.parse(localStorage.getItem(this.chave) || "[]");
    },

    salvar(usuario) {
        const usuarios = this.listar();
        usuarios.push(usuario);
        localStorage.setItem(this.chave, JSON.stringify(usuarios));
        return usuario;
    }
};

// Máscara do CEP: 30100-000
function mascaraCep(valor) {
    const d = valor.replace(/\D/g, "").slice(0, 8);
    if (d.length <= 5) return d;
    return d.slice(0, 5) + "-" + d.slice(5);
}

// UF: só duas letras maiúsculas
function mascaraUf(valor) {
    return valor.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
}

// Número do endereço: só dígitos
function mascaraNumero(valor) {
    return valor.replace(/\D/g, "").slice(0, 6);
}

// Nome: só letras (com acentos) e espaços
function mascaraNome(valor) {
    return valor.replace(/[^a-zA-ZÀ-ÿ ]/g, "");
}

// Formata o telefone enquanto o usuário digita: (31) 99999-9999
function mascaraTelefone(valor) {
    const d = valor.replace(/\D/g, "").slice(0, 11);
    if (d.length === 0) return "";
    if (d.length <= 2) return "(" + d;
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Retorna a mensagem de erro do primeiro campo inválido, ou "" se estiver tudo certo
function validarCadastro(dados) {
    if (dados.nome.length < 3) return "Informe seu nome completo.";
    if (!validarEmail(dados.email)) return "Informe um e-mail válido.";
    if (dados.telefone.replace(/\D/g, "").length < 10) return "Informe um telefone válido com DDD.";
    if (dados.senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
    if (dados.senha !== dados.confirmar) return "As senhas não coincidem.";
    const e = dados.endereco;
    if (e.cep.replace(/\D/g, "").length !== 8) return "Informe um CEP válido.";
    if (e.rua.length < 3) return "Informe o nome da rua.";
    if (e.numero.length === 0) return "Informe o número do endereço.";
    if (e.bairro.length < 2) return "Informe o bairro.";
    if (e.cidade.length < 2) return "Informe a cidade.";
    if (!/^[A-Z]{2}$/.test(e.uf)) return "Informe a UF com 2 letras (ex.: MG).";
    return "";
}

// Gera o hash SHA-256 da senha. Só o hash é guardado, nunca o texto da senha.
async function hashSenha(senha) {
    const bytes = new TextEncoder().encode(senha);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Usuário logado nesta sessão do navegador (sem a senha)
const SessaoService = {
    chave: "usuarioLogado",
    atual() {
        return JSON.parse(localStorage.getItem(this.chave) || "null");
    },
    iniciar(usuario) {
        localStorage.setItem(this.chave, JSON.stringify({ nome: usuario.nome, email: usuario.email }));
    },
    encerrar() {
        localStorage.removeItem(this.chave);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    iniciarPaginaCadastro();
    iniciarPaginaLogin();
    iniciarPaginaPerfil();
    iniciarBotaoSair();
});

// Logado: esconde CADASTRAR e troca ENTRAR por SAIR. Sem login, mantém os dois botões.
function iniciarBotaoSair() {
    const entrar = document.getElementById("entrar1");
    const cadastrar = document.getElementById("cadastrar1");
    if (!entrar || !cadastrar) return; // página sem cabeçalho de conta
    if (!SessaoService.atual()) return;

    cadastrar.remove();
    const link = entrar.querySelector("a");
    link.textContent = "SAIR";
    link.removeAttribute("href");
    link.style.cursor = "pointer";
    link.addEventListener("click", function (e) {
        e.preventDefault();
        SessaoService.encerrar();
        window.location.href = "index.html";
    });
}

function iniciarPaginaCadastro() {
    const form = document.getElementById("form-cadastro");
    if (!form) return; // não está na página de cadastro

    const msg = document.getElementById("msg-cadastro");

    function mostrarMsg(texto, tipo) {
        msg.textContent = texto;
        msg.className = "msg-cadastro " + tipo;
    }

    // Máscara do telefone enquanto digita
    form.telefone.addEventListener("input", function (e) {
        e.target.value = mascaraTelefone(e.target.value);
    });

    // Máscaras dos demais campos enquanto digita
    const mascaras = {
        nome: mascaraNome,
        cep: mascaraCep,
        numero: mascaraNumero,
        uf: mascaraUf
    };
    Object.keys(mascaras).forEach(function (campo) {
        form[campo].addEventListener("input", function (e) {
            e.target.value = mascaras[campo](e.target.value);
        });
    });

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const dados = {
            nome: form.nome.value.trim(),
            email: form.email.value.trim().toLowerCase(),
            telefone: form.telefone.value.trim(),
            senha: form.senha.value,
            confirmar: form.confirmar.value,
            endereco: {
                cep: form.cep.value.trim(),
                rua: form.rua.value.trim(),
                numero: form.numero.value.trim(),
                complemento: form.complemento.value.trim(),
                bairro: form.bairro.value.trim(),
                cidade: form.cidade.value.trim(),
                uf: form.uf.value.trim().toUpperCase()
            }
        };

        const erro = validarCadastro(dados);
        if (erro) {
            mostrarMsg(erro, "msg-erro");
            return;
        }

        if (UsuarioService.listar().some(u => u.email === dados.email)) {
            mostrarMsg("Já existe uma conta com este e-mail.", "msg-erro");
            return;
        }

        // Guarda só o hash da senha, nunca o texto digitado
        UsuarioService.salvar({
            nome: dados.nome,
            email: dados.email,
            telefone: dados.telefone,
            endereco: dados.endereco,
            senhaHash: await hashSenha(dados.senha),
            criadoEm: new Date().toISOString()
        });

        form.reset();
        mostrarMsg("Conta criada com sucesso! Agora você pode entrar.", "msg-sucesso");
    });
}

function iniciarPaginaLogin() {
    const form = document.getElementById("form-login");
    if (!form) return; // não está na página de entrar

    const msg = document.getElementById("msg-login");

    // Só aceita voltar para o carrinho (evita redirecionar para outro site)
    const voltar = new URLSearchParams(window.location.search).get("voltar");
    if (voltar === "carrinho.html") {
        msg.textContent = "Entre ou cadastre-se para finalizar seu pedido.";
        msg.className = "msg-cadastro msg-erro";
    }

    function mostrarMsg(texto, tipo) {
        msg.textContent = texto;
        msg.className = "msg-cadastro " + tipo;
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const email = form.email.value.trim().toLowerCase();
        const senha = form.senha.value;

        if (!validarEmail(email)) {
            mostrarMsg("Informe um e-mail válido.", "msg-erro");
            return;
        }
        if (!senha) {
            mostrarMsg("Informe sua senha.", "msg-erro");
            return;
        }

        const usuario = UsuarioService.listar().find(u => u.email === email);
        // A mesma mensagem para e-mail ou senha errados, para não revelar quais contas existem
        if (!usuario || usuario.senhaHash !== await hashSenha(senha)) {
            mostrarMsg("E-mail ou senha incorretos.", "msg-erro");
            return;
        }

        SessaoService.iniciar(usuario);
        form.reset();
        mostrarMsg("Login realizado! Bem-vindo, " + usuario.nome + ".", "msg-sucesso");
        if (voltar === "carrinho.html") {
            setTimeout(function () { window.location.href = voltar; }, 800);
        }
    });
}

/* ===== PERFIL ===== */

// Mostra só os dados do usuário logado. Sem login, não mostra nenhuma informação.
function iniciarPaginaPerfil() {
    const conteudo = document.getElementById("perfil-conteudo");
    if (!conteudo) return; // não está na página de perfil

    const visitante = document.getElementById("perfil-visitante");
    const sessao = SessaoService.atual();
    const usuario = sessao
        ? UsuarioService.listar().find(u => u.email === sessao.email)
        : null;

    if (!usuario) {
        conteudo.classList.add("oculto");
        visitante.classList.remove("oculto");
        return;
    }

    visitante.classList.add("oculto");
    conteudo.classList.remove("oculto");

    const iniciais = usuario.nome.split(" ").filter(Boolean).slice(0, 2)
        .map(p => p.charAt(0).toUpperCase()).join("");
    const desde = new Date(usuario.criadoEm).toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });

    document.getElementById("perfil-iniciais").textContent = iniciais;
    document.getElementById("perfil-nome").textContent = usuario.nome;
    document.getElementById("perfil-email").textContent = usuario.email;
    document.getElementById("perfil-membro").textContent = "Cliente desde " + desde;
    document.getElementById("perfil-dados-nome").textContent = usuario.nome;
    document.getElementById("perfil-dados-email").textContent = usuario.email;
    document.getElementById("perfil-dados-telefone").textContent = usuario.telefone;

    const e = usuario.endereco || {};
    document.getElementById("perfil-end-cep").textContent = e.cep || "-";
    document.getElementById("perfil-end-rua").textContent = e.rua || "-";
    document.getElementById("perfil-end-numero").textContent = e.numero || "-";
    document.getElementById("perfil-end-complemento").textContent = e.complemento || "-";
    document.getElementById("perfil-end-bairro").textContent = e.bairro || "-";
    document.getElementById("perfil-end-cidade").textContent = e.cidade ? e.cidade + " - " + e.uf : "-";
}

/* ===== BUSCA DE PRODUTOS ===== */

// Remove acentos e maiúsculas para comparar o texto digitado com o nome do produto
function normalizarBusca(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Mostra a mensagem de erro abaixo do cabeçalho. Texto vazio esconde a mensagem.
let timerErroBusca = null;

function mostrarErroBusca(texto) {
    let msg = document.getElementById("msg-busca");
    if (!msg) {
        msg = document.createElement("p");
        msg.id = "msg-busca";
        document.body.appendChild(msg);
    }
    clearTimeout(timerErroBusca);
    msg.textContent = texto;
    msg.hidden = !texto;
    if (texto) {
        timerErroBusca = setTimeout(() => { msg.hidden = true; }, 5000);
    }
}

// Destaca um card de produto e rola até ele
function destacarProduto(card) {
    limparDestaques();
    card.classList.add("card-destaque");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Destaca a fileira inteira (ex.: bebidas) e rola até o início dela
function irParaFileira(fileira) {
    limparDestaques();
    fileira.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Remove todos os destaques antigos antes de marcar um novo
function limparDestaques() {
    document.querySelectorAll(".card-destaque").forEach(el => {
        el.classList.remove("card-destaque");
    });
}

// Procura primeiro nas fileiras (pelo id: habúmgueres, porções, bebidas) e depois nos nomes dos produtos.
// Retorna true se encontrou algo.
function buscarNosProdutos(termo) {
    const termoNormalizado = normalizarBusca(termo);

    // Fileira com o nome exato tem prioridade; depois, nome que contenha o termo
    const fileiras = Array.from(document.querySelectorAll(".cards-direita"));
    const fileira = fileiras.find(f => normalizarBusca(f.id) === termoNormalizado) ||
        fileiras.find(f => normalizarBusca(f.id).includes(termoNormalizado));

    if (fileira) {
        mostrarErroBusca("");
        irParaFileira(fileira);
        return true;
    }

    const cards = Array.from(document.querySelectorAll(".cards-di"));
    const encontrado = cards.find(card =>
        normalizarBusca(card.querySelector("h3").textContent).includes(termoNormalizado)
    );

    if (!encontrado) {
        limparDestaques();
        mostrarErroBusca("Produto \"" + termo + "\" não encontrado.");
        return false;
    }

    mostrarErroBusca("");
    destacarProduto(encontrado);
    return true;
}

function iniciarBuscaProdutos() {
    const barra = document.getElementById("barra-pesquisa");
    if (!barra) return;

    // Só a página de produtos tem os cards; nas outras páginas a busca leva para ela
    const naPaginaProdutos = document.querySelector(".cards-di") !== null;

    barra.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        e.preventDefault();

        const termo = barra.value.trim();
        if (!termo) return;

        if (naPaginaProdutos) {
            buscarNosProdutos(termo);
        } else {
            window.location.href = "produto.html?busca=" + encodeURIComponent(termo);
        }
    });

    // Chegou da busca de outra página com ?busca=...
    if (naPaginaProdutos) {
        const termoUrl = new URLSearchParams(window.location.search).get("busca");
        if (termoUrl) {
            barra.value = termoUrl;
            buscarNosProdutos(termoUrl);
        }
    }
}

document.addEventListener("DOMContentLoaded", iniciarBuscaProdutos);

/* ===== ESCOLHA DE TAMANHO (produtos com duas quantidades) ===== */

// Lê os tamanhos e preços de um card. Ex.: "Coca-cola 2L e 1,5L" + "R$14,00 e 12,00"
// Retorna [] se o card não tiver duas opções.
function opcoesTamanho(card) {
    const tamanhos = card.querySelector("p").textContent.match(/\d+(?:,\d+)?\s?L\b/gi) || [];
    const precos = card.querySelector("h4").textContent.match(/\d+,\d{2}/g) || [];
    if (tamanhos.length < 2 || tamanhos.length !== precos.length) return [];
    return tamanhos.map((t, i) => ({ tamanho: t.replace(/\s/g, ""), preco: extrairPreco(precos[i]) }));
}

function fecharEscolhaTamanho() {
    const modal = document.getElementById("modal-tamanho");
    if (modal) modal.classList.add("oculto");
}

// Mostra a escolha de quantidade e manda o item escolhido para o carrinho
function escolherTamanho(card, opcoes) {
    let modal = document.getElementById("modal-tamanho");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-tamanho";
        modal.className = "modal-tamanho oculto";
        document.body.appendChild(modal);
        modal.addEventListener("click", function (e) {
            if (e.target === modal) fecharEscolhaTamanho();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") fecharEscolhaTamanho();
        });
    }

    const nome = card.querySelector("h3").textContent.trim();
    const conteudo = document.createElement("div");
    conteudo.className = "modal-tamanho-conteudo";

    const titulo = document.createElement("h3");
    titulo.textContent = "Escolha a quantidade";
    const subtitulo = document.createElement("p");
    subtitulo.textContent = nome;
    conteudo.append(titulo, subtitulo);

    opcoes.forEach(function (op) {
        const b = document.createElement("button");
        b.className = "opcao-tamanho";
        b.textContent = op.tamanho + " - " + formatarMoeda(op.preco);
        b.addEventListener("click", function () {
            CarrinhoService.adicionar({ nome: nome + " " + op.tamanho, preco: op.preco });
            atualizarBadgeCarrinho();
            fecharEscolhaTamanho();
        });
        conteudo.appendChild(b);
    });

    const cancelar = document.createElement("button");
    cancelar.className = "opcao-tamanho opcao-cancelar";
    cancelar.textContent = "CANCELAR";
    cancelar.addEventListener("click", fecharEscolhaTamanho);
    conteudo.appendChild(cancelar);

    modal.replaceChildren(conteudo);
    modal.classList.remove("oculto");
}


/* ===== BAIXAR CARRINHO EM JSON ===== */

// Monta o carrinho.json com os itens e o total, e faz o download
function baixarCarrinhoJson(itens, cliente, pedidoId) {
    const linhas = itens.map(function (i) {
        return {
            nome: i.nome,
            preco: i.preco,
            quantidade: i.quantidade,
            subtotal: Math.round(i.preco * i.quantidade * 100) / 100
        };
    });
    const total = linhas.reduce((soma, i) => soma + i.subtotal, 0);

    const dados = {
        pedidoId: pedidoId,
        geradoEm: new Date().toISOString(),
        cliente: cliente,
        itens: linhas,
        total: Math.round(total * 100) / 100
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "carrinho.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/* ===== MENU HAMBURGUER ===== */
// Abre e fecha a lista do menu no celular/tablet
document.addEventListener("DOMContentLoaded", function () {
    const btnMenu = document.getElementById("btn-menu");
    const nav = document.querySelector("header nav");
    if (!btnMenu || !nav) return;

    btnMenu.addEventListener("click", function () {
        const aberto = nav.classList.toggle("aberto");
        btnMenu.classList.toggle("ativo", aberto);
        btnMenu.setAttribute("aria-expanded", aberto);
    });
});


/* ===== RODAPE RECOLHIVEL (celular) ===== */
// Abre e fecha NAVEGAÇÃO e CONTATO no rodapé ao tocar no título
document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".footer-secao .footer-titulo-toggle").forEach(function (titulo) {
        function alternar() {
            const aberto = titulo.closest(".footer-secao").classList.toggle("aberto");
            titulo.setAttribute("aria-expanded", aberto);
        }
        titulo.addEventListener("click", alternar);
        titulo.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                alternar();
            }
        });
    });
});
