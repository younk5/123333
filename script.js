// ========================================
// SISTEMA DE CONSULTA DE PREÇOS v4.3
// Com suporte a múltiplas categorias e JSON separados
// MELHORADO: Scroll otimizado + Performance aprimorada
// ========================================

// Variáveis globais
let produtos = [];
let abaAtiva = 'frontal';
let filtroTimeout;
let produtosFiltrados = []; // Cache dos produtos filtrados
let produtosCarregados = 0; // Para scroll infinito
let itensPorPagina = 50; // Controle de paginação
let carregandoMais = false; // Flag para evitar carregamentos duplicados

// Elementos DOM
const loading = document.getElementById("loading");
const search = document.getElementById("search");
const marcaSelect = document.getElementById("marca");
const produtosVisiveisEl = document.getElementById("produtos-visiveis");
const totalProdutosEl = document.getElementById("total-produtos");
const totalMarcasEl = document.getElementById("total-marcas");
const produtosDisponiveisEl = document.getElementById("produtos-disponiveis");
const footerInfo = document.getElementById("footer-info");

const tabelaFrontal = document.getElementById("tabela-frontal");
const tabelaBateria = document.getElementById("tabela-bateria");
const tabelaConector = document.getElementById("tabela-conector");

// ========================================
// CONFIGURAÇÕES DE SCROLL E PERFORMANCE
// ========================================
const scrollConfig = {
    suave: true,
    infinito: true,
    velocidadeAnimacao: 0.8,
    offsetCarregamento: 200, // Pixels antes do fim para carregar mais
    debounceScroll: 16, // ~60fps
    animacaoEntrada: true
};

// ========================================
// FUNÇÃO PARA ABRIR CONFIGURAÇÕES
// ========================================
function abrirConfiguracoes() {
    console.log('⚙️ Abrindo página de configurações...');
    window.location.href = 'config.html';
}

// ========================================
// SCROLL SUAVE E OTIMIZADO
// ========================================
function initScrollSuave() {
    // CSS para scroll suave
    if (!document.getElementById('scroll-smooth-css')) {
        const style = document.createElement('style');
        style.id = 'scroll-smooth-css';
        style.textContent = `
            html {
                scroll-behavior: smooth;
            }
            
            .table-container {
                position: relative;
                overflow-y: auto;
                max-height: 70vh;
                scroll-behavior: smooth;
                scrollbar-width: thin;
                scrollbar-color: rgba(0,123,255,0.3) transparent;
            }
            
            .table-container::-webkit-scrollbar {
                width: 8px;
            }
            
            .table-container::-webkit-scrollbar-track {
                background: rgba(0,0,0,0.1);
                border-radius: 4px;
            }
            
            .table-container::-webkit-scrollbar-thumb {
                background: rgba(0,123,255,0.3);
                border-radius: 4px;
                transition: background 0.3s ease;
            }
            
            .table-container::-webkit-scrollbar-thumb:hover {
                background: rgba(0,123,255,0.6);
            }
            
            .scroll-to-top {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                display: none;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,123,255,0.3);
                transition: all 0.3s ease;
                font-size: 18px;
            }
            
            .scroll-to-top:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0,123,255,0.4);
            }
            
            .loading-more {
                text-align: center;
                padding: 20px;
                color: #6c757d;
                font-style: italic;
            }
            
            .produto-row {
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .produto-row.visible {
                opacity: 1;
                transform: translateY(0);
            }
            
            .produto-row:nth-child(even) {
                background-color: rgba(0,0,0,0.02);
            }
            
            .produto-row:hover {
                background-color: rgba(0,123,255,0.08);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            @media (prefers-reduced-motion: reduce) {
                * {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
                
                html {
                    scroll-behavior: auto;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Botão voltar ao topo
    if (!document.getElementById('scroll-to-top-btn')) {
        const scrollBtn = document.createElement('button');
        scrollBtn.id = 'scroll-to-top-btn';
        scrollBtn.className = 'scroll-to-top';
        scrollBtn.innerHTML = '↑';
        scrollBtn.title = 'Voltar ao topo (Home)';
        scrollBtn.onclick = scrollToTop;
        document.body.appendChild(scrollBtn);
    }
}

function scrollToTop() {
    if (scrollConfig.suave) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } else {
        window.scrollTo(0, 0);
    }
}

function scrollToElement(element) {
    if (!element) return;
    
    element.scrollIntoView({
        behavior: scrollConfig.suave ? 'smooth' : 'auto',
        block: 'center'
    });
}

// ========================================
// SCROLL INFINITO INTELIGENTE
// ========================================
function initScrollInfinito() {
    let scrollTimeout;
    
    const handleScroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            const scrollBtn = document.getElementById('scroll-to-top-btn');
            
            // Mostra/esconde botão de voltar ao topo
            if (window.pageYOffset > 300) {
                if (scrollBtn) scrollBtn.style.display = 'block';
            } else {
                if (scrollBtn) scrollBtn.style.display = 'none';
            }
            
            // Scroll infinito
            if (scrollConfig.infinito && !carregandoMais) {
                const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                
                if (scrollTop + clientHeight >= scrollHeight - scrollConfig.offsetCarregamento) {
                    carregarMaisProdutos();
                }
            }
        }, scrollConfig.debounceScroll);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
}

function carregarMaisProdutos() {
    if (carregandoMais || produtosCarregados >= produtosFiltrados.length) {
        return;
    }
    
    carregandoMais = true;
    
    // Mostra indicador de carregamento
    mostrarIndicadorCarregamento();
    
    setTimeout(() => {
        const proximoLote = produtosFiltrados.slice(produtosCarregados, produtosCarregados + itensPorPagina);
        
        if (proximoLote.length > 0) {
            adicionarProdutosTabela(proximoLote);
            produtosCarregados += proximoLote.length;
        }
        
        esconderIndicadorCarregamento();
        carregandoMais = false;
    }, 300); // Pequeno delay para melhor UX
}

function mostrarIndicadorCarregamento() {
    const tabelaAtiva = getTabelaAtiva();
    if (!tabelaAtiva) return;
    
    const loadingRow = document.createElement('tr');
    loadingRow.id = 'loading-more-row';
    loadingRow.innerHTML = `
        <td colspan="3">
            <div class="loading-more">
                <div style="display: inline-flex; align-items: center; gap: 10px;">
                    <div class="spinner-border spinner-border-sm" role="status"></div>
                    📦 Carregando mais produtos...
                </div>
            </div>
        </td>
    `;
    tabelaAtiva.appendChild(loadingRow);
}

function esconderIndicadorCarregamento() {
    const loadingRow = document.getElementById('loading-more-row');
    if (loadingRow) {
        loadingRow.remove();
    }
}

// ========================================
// NAVEGAÇÃO POR TECLADO APRIMORADA
// ========================================
function initNavegacaoTeclado() {
    let produtoSelecionado = -1;
    
    document.addEventListener('keydown', (e) => {
        const produtos = document.querySelectorAll('.produto-row:not(#loading-more-row)');
        
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                produtoSelecionado = Math.min(produtoSelecionado + 1, produtos.length - 1);
                destacarProduto(produtos, produtoSelecionado);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                produtoSelecionado = Math.max(produtoSelecionado - 1, 0);
                destacarProduto(produtos, produtoSelecionado);
                break;
                
            case 'Home':
                e.preventDefault();
                produtoSelecionado = 0;
                destacarProduto(produtos, produtoSelecionado);
                scrollToTop();
                break;
                
            case 'End':
                e.preventDefault();
                produtoSelecionado = produtos.length - 1;
                destacarProduto(produtos, produtoSelecionado);
                break;
                
            case 'PageDown':
                e.preventDefault();
                produtoSelecionado = Math.min(produtoSelecionado + 10, produtos.length - 1);
                destacarProduto(produtos, produtoSelecionado);
                break;
                
            case 'PageUp':
                e.preventDefault();
                produtoSelecionado = Math.max(produtoSelecionado - 10, 0);
                destacarProduto(produtos, produtoSelecionado);
                break;
        }
    });
}

function destacarProduto(produtos, index) {
    // Remove destaque anterior
    produtos.forEach(row => row.classList.remove('produto-selecionado'));
    
    if (produtos[index]) {
        produtos[index].classList.add('produto-selecionado');
        scrollToElement(produtos[index]);
    }
}

// ========================================
// FUNÇÃO PARA CALCULAR PREÇO COM DESCONTO APARENTE
// ========================================
function calcularPrecoComDesconto(precoOriginal) {
    let percentualAcrescimo = 20; // Padrão
    
    try {
        const configSalva = localStorage.getItem('configSistema');
        if (configSalva) {
            const config = JSON.parse(configSalva);
            percentualAcrescimo = parseFloat(config.percentualAcrescimo) || 20;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar configuração de preço:', error);
    }
    
    let valorLimpo = precoOriginal.replace(/[R$\s]/g, '').replace(',', '.');
    let valorNumerico = parseFloat(valorLimpo);
    
    if (isNaN(valorNumerico)) {
        let match = precoOriginal.match(/[\d,]+/);
        if (match) {
            valorNumerico = parseFloat(match[0].replace(',', '.'));
        }
    }
    
    if (!isNaN(valorNumerico) && valorNumerico > 0) {
        let precoFinal = valorNumerico * (1 + (percentualAcrescimo / 100));
        let percentualDesconto = Math.round(percentualAcrescimo);
        
        return {
            precoOriginal: valorNumerico,
            precoFinal: precoFinal,
            precoFinalFormatado: `R$ ${precoFinal.toFixed(2).replace('.', ',')}`,
            precoOriginalFormatado: `R$ ${valorNumerico.toFixed(2).replace('.', ',')}`,
            percentualDesconto: percentualDesconto,
            percentualAcrescimo: percentualAcrescimo
        };
    }
    
    return {
        precoOriginal: 0,
        precoFinal: 0,
        precoFinalFormatado: precoOriginal,
        precoOriginalFormatado: precoOriginal,
        percentualDesconto: 0,
        percentualAcrescimo: percentualAcrescimo
    };
}

// ========================================
// CARREGAMENTO DE DADOS DOS JSONS
// ========================================
async function carregarDados() {
    mostrarCarregamento();
    console.log("📄 Carregando dados do sistema v4.3 com scroll otimizado...");

    const arquivos = ["dados/telas.json", "dados/baterias.json", "dados/conectores.json"];
    let todosProdutos = [];

    for (let arquivo of arquivos) {
        try {
            const response = await fetch(arquivo);
            if (!response.ok) {
                throw new Error(`Arquivo não encontrado: ${arquivo} (HTTP ${response.status})`);
            }

            const texto = await response.text();
            if (!texto.trim()) {
                throw new Error(`Arquivo vazio: ${arquivo}`);
            }

            console.log(`📥 Carregando ${arquivo}...`);

            let dados;
            try {
                dados = JSON.parse(texto);
            } catch (jsonError) {
                throw new Error(`JSON inválido em ${arquivo}: ${jsonError.message}`);
            }

            if (dados && Array.isArray(dados.produtos)) {
                todosProdutos = todosProdutos.concat(dados.produtos);
                console.log(`✅ ${dados.produtos.length} produtos carregados de ${arquivo}`);
            } else {
                console.warn(`⚠️ Estrutura inválida em ${arquivo} - esperado: {produtos: []}`);
            }

            if (footerInfo && dados.configuracoes) {
                const config = localStorage.getItem('configSistema');
                const empresaNome = config ? JSON.parse(config).empresaNome || dados.configuracoes.empresa : dados.configuracoes.empresa;
                const percentualAtual = config ? JSON.parse(config).percentualAcrescimo || '20' : '20';
                const descontoEquivalente = Math.round(parseFloat(percentualAtual));

                footerInfo.innerHTML = `
                    🔧 ${dados.configuracoes.sistema} v4.3 • 
                    ${empresaNome} • 
                    Atualizado em ${formatarData(dados.configuracoes.dataAtualizacao)} • 
                    <span style="color: #dc3545; font-weight: bold;">🏷️ Descontos até ${descontoEquivalente}%</span> •
                    <span style="color: #007bff;">🖱️ Scroll otimizado</span>
                `;
            }

        } catch (err) {
            console.error(`❌ Erro ao carregar ${arquivo}:`, err);
            mostrarErroCarregamento(`Erro em ${arquivo}: ${err.message}`);
            continue;
        }
    }

    if (todosProdutos.length === 0) {
        mostrarErroCarregamento("Nenhum produto foi carregado. Verifique os arquivos JSON.");
        return;
    }

    produtos = todosProdutos;
    atualizarInterface();
    atualizarSelectMarcas();
    carregarDadosAba(abaAtiva);
    esconderCarregamento();
    console.log(`📦 Total de produtos carregados: ${produtos.length}`);
}

// ========================================
// INTERFACE
// ========================================
function atualizarInterface() {
    if (totalProdutosEl) totalProdutosEl.textContent = produtos.length;
    if (produtosVisiveisEl) produtosVisiveisEl.textContent = produtos.length;
    
    const marcasUnicas = [...new Set(produtos.map(p => p.marca))].length;
    if (totalMarcasEl) totalMarcasEl.textContent = marcasUnicas;
    
    const produtosDisponiveis = produtos.filter(p => p.disponivel !== false).length;
    if (produtosDisponiveisEl) produtosDisponiveisEl.textContent = produtosDisponiveis;
}

function atualizarSelectMarcas() {
    if (!marcaSelect) return;
    
    const marcasUnicas = [...new Set(produtos.map(p => p.marca))].sort();
    
    while (marcaSelect.children.length > 1) {
        marcaSelect.removeChild(marcaSelect.lastChild);
    }
    
    marcasUnicas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca;
        option.textContent = `📱 ${marca.charAt(0).toUpperCase() + marca.slice(1)}`;
        marcaSelect.appendChild(option);
    });
}

// ========================================
// ABAS
// ========================================
function switchTab(novaAba) {
    const tabButtons = document.querySelectorAll('.tab-btn:not(.config-tab)');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    const tabBtn = document.querySelector(`[data-tab="${novaAba}"]`);
    if (tabBtn && !tabBtn.classList.contains('config-tab')) {
        tabBtn.classList.add('active');
    }
    
    const tabContent = document.getElementById(`${novaAba}-content`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    abaAtiva = novaAba;
    carregarDadosAba(novaAba);
    scrollToTop(); // Volta ao topo quando troca de aba
    console.log(`📑 Aba alterada para: ${novaAba}`);
}

function carregarDadosAba(categoria) {
    const produtosDaCategoria = produtos.filter(p => p.categoria === categoria);
    produtosFiltrados = produtosDaCategoria;
    produtosCarregados = 0;
    
    const tabelaAtiva = getTabelaAtiva();
    if (tabelaAtiva) {
        tabelaAtiva.innerHTML = '';
    }
    
    // Carrega primeiro lote
    carregarMaisProdutos();
    
    // Aplica filtros existentes
    filtrar();
}

function getTabelaAtiva() {
    switch(abaAtiva) {
        case 'frontal': return tabelaFrontal;
        case 'bateria': return tabelaBateria;
        case 'conector': return tabelaConector;
        default: return null;
    }
}

// ========================================
// TABELAS COM SCROLL INFINITO
// ========================================
function adicionarProdutosTabela(lista) {
    const tabelaAtiva = getTabelaAtiva();
    if (!tabelaAtiva || !lista || lista.length === 0) return;
    
    let mostrarPrecoOriginal = true;
    let destacarDesconto = true;
    
    try {
        const configSalva = localStorage.getItem('configSistema');
        if (configSalva) {
            const config = JSON.parse(configSalva);
            mostrarPrecoOriginal = config.mostrarPrecoOriginal !== false;
            destacarDesconto = config.destacarAcrescimo !== false;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar configurações de exibição:', error);
    }

    const fragment = document.createDocumentFragment();

    lista.forEach((produto, index) => {
        const row = document.createElement('tr');
        row.className = 'produto-row';
        
        const statusIcon = produto.disponivel !== false ? '✅' : '❌';
        const statusClass = produto.disponivel !== false ? 'status-available' : 'status-unavailable';
        
        const precoData = calcularPrecoComDesconto(produto.preco || 'R$ 0,00');
        
        let precoHTML = `<div style="font-weight: bold; color: #28a745; font-size: 1.1em;">${precoData.precoFinalFormatado}</div>`;
        
        if (mostrarPrecoOriginal && precoData.precoOriginal > 0) {
            precoHTML += `<div style="font-size: 0.9em; color: #6c757d; text-decoration: line-through;">Desconto: ${precoData.precoOriginalFormatado}</div>`;
        }
        
        if (destacarDesconto && precoData.percentualDesconto > 0) {
            precoHTML += `<div style="font-size: 0.8em; color: #dc3545; font-weight: bold;">🏷️ ${precoData.percentualDesconto}% OFF</div>`;
        }
        
        const tipo = getTipoCategoria(abaAtiva);
        
        row.innerHTML = `
            <td>
                <div class="product-info ${statusClass}">
                    <div class="product-name">${statusIcon} ${produto.nome || 'Produto sem nome'}</div>
                    <div class="product-brand brand-${produto.marca || 'generica'}">${(produto.marca || 'GENÉRICA').toUpperCase()}</div>
                    <div class="product-meta">
                        <span>ID: ${produto.id || 'N/A'}</span>
                        <span class="product-specs">${tipo}</span>
                        <span>${produto.disponivel !== false ? 'Disponível' : 'Indisponível'}</span>
                    </div>
                </div>
            </td>
            <td>
                ${produto.capacidade ? `<div>⚡ ${produto.capacidade}</div>` : ''}
                ${produto.tipo ? `<div>${produto.tipo}</div>` : ''}
            </td>
            <td>
                <div class="product-price ${statusClass}">
                    ${precoHTML}
                </div>
                <div class="price-date">📅 ${formatarData(produto.dataAtualizacao)}</div>
            </td>
        `;
        
        fragment.appendChild(row);
        
        // Animação de entrada otimizada
        if (scrollConfig.animacaoEntrada) {
            requestAnimationFrame(() => {
                setTimeout(() => {
                    row.classList.add('visible');
                }, index * 30); // Animação escalonada
            });
        } else {
            row.classList.add('visible');
        }
    });

    tabelaAtiva.appendChild(fragment);
}

function getTipoCategoria(categoria) {
    switch(categoria) {
        case 'frontal': return '📱 Frontal Original';
        case 'bateria': return '🔋 Bateria Original';
        case 'conector': return '🔌 Conector Original';
        default: return '📦 Produto';
    }
}

function mostrarProdutosTabela(lista, tabelaEl, tipo) {
    if (!tabelaEl) {
        console.warn('Elemento da tabela não encontrado');
        return;
    }
    
    tabelaEl.innerHTML = "";
    produtosCarregados = 0;
    
    if (!lista || lista.length === 0) {
        tabelaEl.innerHTML = `
        <tr><td colspan="3">
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Nenhum produto encontrado</h3>
                <p>Tente ajustar os filtros ou usar outros termos de busca</p>
                <button class="btn btn-warning" onclick="limparFiltros()">🗑️ Limpar Filtros</button>
            </div>
        </td></tr>`;
        atualizarContadorVisivel(0);
        return;
    }

    produtosFiltrados = lista;
    
    // Carrega primeiro lote
    const primeiroLote = lista.slice(0, itensPorPagina);
    adicionarProdutosTabela(primeiroLote);
    produtosCarregados = primeiroLote.length;
    
    atualizarContadorVisivel(lista.length);
}

// ========================================
// FILTROS
// ========================================
function filtrar() {
    clearTimeout(filtroTimeout);
    
    filtroTimeout = setTimeout(() => {
        const texto = search ? search.value.toLowerCase().trim() : '';
        const marca = marcaSelect ? marcaSelect.value : 'todas';
        const produtosDaCategoria = produtos.filter(p => p.categoria === abaAtiva);

        const filtrados = produtosDaCategoria.filter(produto => {
            const condMarca = marca === "todas" || produto.marca === marca;
            
            let condTexto = true;
            if (texto !== "") {
                const campos = [
                    produto.nome,
                    produto.id ? produto.id.toString() : '',
                    produto.preco,
                    produto.capacidade,
                    produto.tipo,
                    produto.marca
                ].filter(campo => campo != null);
                
                condTexto = campos.some(campo => 
                    campo.toLowerCase().includes(texto)
                );
            }
            
            return condMarca && condTexto;
        });

        const tabelaAtiva = getTabelaAtiva();
        if (tabelaAtiva) {
            const tipo = getTipoCategoria(abaAtiva);
            mostrarProdutosTabela(filtrados, tabelaAtiva, tipo);
        }
        
        console.log(`🔍 Filtros aplicados: ${filtrados.length} produtos encontrados`);
    }, 250);
}

function limparFiltros() {
    if (search) {
        search.value = "";
        search.focus();
    }
    if (marcaSelect) {
        marcaSelect.value = "todas";
    }
    filtrar();
    scrollToTop();
    console.log('🗑️ Filtros limpos');
}

function atualizarContadorVisivel(quantidade) {
    if (produtosVisiveisEl) {
        produtosVisiveisEl.textContent = quantidade;
        try {
            produtosVisiveisEl.style.transform = 'scale(1.1)';
            setTimeout(() => produtosVisiveisEl.style.transform = 'scale(1)', 150);
        } catch (error) {
            // Ignora erro de animação
        }
    }
}

// ========================================
// LOADING E ERROS
// ========================================
function mostrarCarregamento() {
    if (loading) loading.style.display = 'flex';
    document.querySelectorAll('.table-section').forEach(el => {
        if (el) el.style.display = 'none';
    });
}

function esconderCarregamento() {
    if (loading) loading.style.display = 'none';
    document.querySelectorAll('.table-section').forEach(el => {
        if (el) el.style.display = 'block';
    });
}

function mostrarErroCarregamento(mensagem) {
    const tabelaAtiva = getTabelaAtiva();
    if (tabelaAtiva) {
        tabelaAtiva.innerHTML = `
        <tr><td colspan="3">
            <div class="no-results" style="text-align: center; padding: 2rem;">
                <div class="no-results-icon" style="font-size: 3em; margin-bottom: 1rem;">⚠️</div>
                <h3 style="color: #dc3545;">Erro ao carregar dados</h3>
                <p><strong>Detalhes:</strong> ${mensagem}</p>
                <p>Verifique se os arquivos JSON existem e estão no formato correto</p>
                <button class="btn btn-warning" onclick="carregarDados()" style="margin-top: 1rem;">🔄 Tentar Novamente</button>
            </div>
        </td></tr>`;
    }
    esconderCarregamento();
}

// ========================================
// UTILITÁRIOS
// ========================================
function formatarData(data) {
    if (!data) return 'N/A';
    try {
        const date = new Date(data);
        if (isNaN(date.getTime())) return data;
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    } catch (error) {
        return data;
    }
}

// ========================================
// APLICAR CONFIGURAÇÕES SALVAS
// ========================================
function aplicarConfiguracoesSalvas() {
    try {
        const configSalva = localStorage.getItem('configSistema');
        if (configSalva) {
            const config = JSON.parse(configSalva);
            
            // Aplicar configurações de scroll
            if (config.scrollSuave !== undefined) {
                scrollConfig.suave = config.scrollSuave;
            }
            
            if (config.scrollInfinito !== undefined) {
                scrollConfig.infinito = config.scrollInfinito;
            }
            
            if (config.animacoesInterface === false) {
                scrollConfig.animacaoEntrada = false;
                document.documentElement.style.setProperty('--animation-duration', '0s');
                console.log('🎨 Animações desabilitadas');
            }
            
            // Aplicar intervalo de atualização automática
            if (config.intervaloAtualizacao && config.intervaloAtualizacao !== '0') {
                const intervalo = parseInt(config.intervaloAtualizacao) * 1000;
                if (intervalo > 0 && intervalo <= 3600000) { // Máximo 1 hora
                    setInterval(() => {
                        console.log('🔄 Atualização automática executada');
                        carregarDados();
                    }, intervalo);
                    console.log(`⏰ Atualização automática: ${config.intervaloAtualizacao}s`);
                }
            }
            
            // Aplicar modo debug
            if (config.modoDebug) {
                window.DEBUG_MODE = true;
                console.log('🐛 Modo debug ativado');
            }
            
            // Aplicar configurações de performance
            if (config.itensPorPagina) {
                itensPorPagina = parseInt(config.itensPorPagina) || 50;
            }
            
            console.log('⚙️ Configurações aplicadas com sucesso');
        }
    } catch (error) {
        console.warn('⚠️ Erro ao aplicar configurações:', error);
    }
}

// ========================================
// MONITORAR MUDANÇAS NAS CONFIGURAÇÕES
// ========================================
function monitorarConfiguracoes() {
    let configAnterior = localStorage.getItem('configSistema');
    
    const intervaloMonitoramento = setInterval(() => {
        try {
            const configAtual = localStorage.getItem('configSistema');
            
            if (configAtual !== configAnterior) {
                console.log('⚙️ Configurações alteradas, reaplicando...');
                aplicarConfiguracoesSalvas();
                
                // Recarrega a interface se necessário
                if (produtos.length > 0) {
                    carregarDadosAba(abaAtiva);
                }
                
                configAnterior = configAtual;
            }
        } catch (error) {
            console.warn('⚠️ Erro no monitoramento de configurações:', error);
        }
    }, 2000); // Verifica a cada 2 segundos
    
    // Limpa o intervalo após 1 hora para evitar vazamentos de memória
    setTimeout(() => clearInterval(intervaloMonitoramento), 3600000);
}

// ========================================
// OTIMIZAÇÕES DE PERFORMANCE
// ========================================
function otimizarPerformance() {
    // Lazy loading para imagens se existirem
    const observerOptions = {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
    };
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            }
        });
    }, observerOptions);
    
    // Observer para animações de entrada
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && scrollConfig.animacaoEntrada) {
                entry.target.classList.add('visible');
                animationObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // Aplica observers em novos elementos
    const observeNewElements = () => {
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        document.querySelectorAll('.produto-row:not(.visible)').forEach(row => {
            animationObserver.observe(row);
        });
    };
    
    // Mutation Observer para detectar novos elementos
    const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                observeNewElements();
            }
        });
    });
    
    mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Debounce para redimensionamento da janela
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Recalcula layout se necessário
            console.log('📐 Layout recalculado após redimensionamento');
        }, 250);
    }, { passive: true });
}

// ========================================
// GESTOS TOUCH PARA MOBILE
// ========================================
function initGestosTouch() {
    let touchStartY = 0;
    let touchStartX = 0;
    let isScrolling = false;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isScrolling = false;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isScrolling) {
            const touchY = e.touches[0].clientY;
            const touchX = e.touches[0].clientX;
            const diffY = touchStartY - touchY;
            const diffX = touchStartX - touchX;
            
            // Detecta se é scroll vertical
            if (Math.abs(diffY) > Math.abs(diffX)) {
                isScrolling = true;
            }
        }
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (isScrolling) {
            const touchEndY = e.changedTouches[0].clientY;
            const diff = touchStartY - touchEndY;
            
            // Swipe para cima (carregar mais)
            if (diff > 100 && scrollConfig.infinito) {
                carregarMaisProdutos();
            }
            
            // Swipe para baixo (voltar ao topo)
            if (diff < -150) {
                scrollToTop();
            }
        }
        isScrolling = false;
    }, { passive: true });
}

// ========================================
// BUSCA INTELIGENTE COM SUGESTÕES
// ========================================
function initBuscaInteligente() {
    if (!search) return;
    
    let sugestoes = [];
    
    // Cria container de sugestões
    const suggestoesContainer = document.createElement('div');
    suggestoesContainer.id = 'sugestoes-container';
    suggestoesContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        max-height: 200px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    search.parentNode.style.position = 'relative';
    search.parentNode.appendChild(suggestoesContainer);
    
    // Gera sugestões baseadas nos produtos
    function gerarSugestoes() {
        const termos = new Set();
        produtos.forEach(produto => {
            if (produto.nome) termos.add(produto.nome.toLowerCase());
            if (produto.marca) termos.add(produto.marca.toLowerCase());
            if (produto.tipo) termos.add(produto.tipo.toLowerCase());
            if (produto.id) termos.add(produto.id.toString());
        });
        sugestoes = Array.from(termos).sort();
    }
    
    // Mostra sugestões
    function mostrarSugestoes(termo) {
        if (!termo || termo.length < 2) {
            suggestoesContainer.style.display = 'none';
            return;
        }
        
        const sugestoesFiltradas = sugestoes
            .filter(s => s.includes(termo.toLowerCase()))
            .slice(0, 8);
        
        if (sugestoesFiltradas.length === 0) {
            suggestoesContainer.style.display = 'none';
            return;
        }
        
        suggestoesContainer.innerHTML = sugestoesFiltradas
            .map(sugestao => `
                <div class="sugestao-item" style="
                    padding: 10px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#f8f9fa'"
                   onmouseout="this.style.background='white'"
                   onclick="selecionarSugestao('${sugestao}')">
                    🔍 ${sugestao}
                </div>
            `).join('');
        
        suggestoesContainer.style.display = 'block';
    }
    
    // Event listeners para busca
    search.addEventListener('input', (e) => {
        mostrarSugestoes(e.target.value);
        filtrar();
    });
    
    search.addEventListener('focus', () => {
        gerarSugestoes();
        mostrarSugestoes(search.value);
    });
    
    // Esconde sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        if (!search.parentNode.contains(e.target)) {
            suggestoesContainer.style.display = 'none';
        }
    });
    
    // Função global para selecionar sugestão
    window.selecionarSugestao = (sugestao) => {
        search.value = sugestao;
        suggestoesContainer.style.display = 'none';
        filtrar();
        search.focus();
    };
}

// ========================================
// ATALHOS DE TECLADO APRIMORADOS
// ========================================
function initAtalhosAprimorados() {
    document.addEventListener('keydown', (e) => {
        try {
            // Ctrl+K para focar na busca
            if (e.ctrlKey && e.key === 'k') { 
                e.preventDefault(); 
                if (search) {
                    search.focus(); 
                    search.select();
                }
            }
            
            // ESC para limpar filtros
            if (e.key === 'Escape') { 
                limparFiltros(); 
                document.getElementById('sugestoes-container')?.style.setProperty('display', 'none');
            }
            
            // Alt+C para limpar filtros
            if (e.altKey && e.key === 'c') { 
                limparFiltros(); 
            }
            
            // F5 ou Ctrl+R para recarregar dados
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) { 
                e.preventDefault(); 
                carregarDados(); 
            }
            
            // Alt + números para trocar abas
            if (e.altKey && !isNaN(e.key) && e.key >= '1' && e.key <= '3') {
                e.preventDefault();
                const abas = ['frontal', 'bateria', 'conector'];
                const index = parseInt(e.key) - 1;
                if (abas[index]) {
                    switchTab(abas[index]);
                }
            }
            
            // Ctrl+↑ para voltar ao topo
            if (e.ctrlKey && e.key === 'ArrowUp') {
                e.preventDefault();
                scrollToTop();
            }
            
            // Ctrl+↓ para ir ao fim
            if (e.ctrlKey && e.key === 'ArrowDown') {
                e.preventDefault();
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: scrollConfig.suave ? 'smooth' : 'auto'
                });
            }
            
            // Space para carregar mais (se no final)
            if (e.key === ' ' && scrollConfig.infinito) {
                const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
                if (scrollTop + clientHeight >= scrollHeight - 100) {
                    e.preventDefault();
                    carregarMaisProdutos();
                }
            }
            
        } catch (error) {
            console.warn('⚠️ Erro no atalho de teclado:', error);
        }
    });
}

// ========================================
// ESTATÍSTICAS E ANALYTICS
// ========================================
function initEstatisticas() {
    const stats = {
        pesquisasRealizadas: 0,
        filtrosAplicados: 0,
        abasTrocadas: 0,
        tempoSessao: Date.now(),
        produtosMaisVistos: new Map()
    };
    
    // Registra estatísticas
    const originalFiltrar = filtrar;
    window.filtrar = function() {
        stats.pesquisasRealizadas++;
        return originalFiltrar.apply(this, arguments);
    };
    
    const originalSwitchTab = switchTab;
    window.switchTab = function(aba) {
        stats.abasTrocadas++;
        return originalSwitchTab.apply(this, arguments);
    };
    
    // Salva estatísticas periodicamente
    setInterval(() => {
        try {
            const estatisticas = {
                ...stats,
                tempoSessaoMinutos: Math.round((Date.now() - stats.tempoSessao) / 60000)
            };
            localStorage.setItem('estatisticasSessao', JSON.stringify(estatisticas));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar estatísticas:', error);
        }
    }, 30000); // A cada 30 segundos
    
    // Log de performance no console
    if (window.DEBUG_MODE) {
        setInterval(() => {
            console.log('📊 Estatísticas da sessão:', {
                'Pesquisas realizadas': stats.pesquisasRealizadas,
                'Filtros aplicados': stats.filtrosAplicados,
                'Abas trocadas': stats.abasTrocadas,
                'Tempo de sessão': `${Math.round((Date.now() - stats.tempoSessao) / 60000)}min`,
                'Produtos carregados': produtosCarregados,
                'Performance': `${produtos.length} produtos total`
            });
        }, 60000); // A cada minuto
    }
}

// ========================================
// EVENT LISTENERS E INICIALIZAÇÃO PRINCIPAL
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de Consulta v4.3 com scroll otimizado inicializando...');
    
    // Inicializa componentes de scroll
    initScrollSuave();
    initScrollInfinito();
    initNavegacaoTeclado();
    initGestosTouch();
    initBuscaInteligente();
    initAtalhosAprimorados();
    
    // Otimizações de performance
    otimizarPerformance();
    
    // Estatísticas e monitoramento
    initEstatisticas();
    
    // Carrega dados iniciais
    carregarDados();
    
    // Aplica configurações salvas
    aplicarConfiguracoesSalvas();
    
    // Inicia monitoramento
    monitorarConfiguracoes();
    
    // Event listeners básicos
    if (search) {
        search.addEventListener("input", filtrar);
        // Foco no campo de busca após carregamento
        setTimeout(() => search.focus(), 2000);
    }
    
    if (marcaSelect) {
        marcaSelect.addEventListener("change", filtrar);
    }
    
    // Adiciona estilo para produto selecionado
    if (!document.getElementById('navegacao-teclado-css')) {
        const style = document.createElement('style');
        style.id = 'navegacao-teclado-css';
        style.textContent = `
            .produto-selecionado {
                background-color: rgba(0, 123, 255, 0.15) !important;
                border-left: 4px solid #007bff;
                transform: translateX(2px);
            }
            
            .sugestao-item:last-child {
                border-bottom: none !important;
            }
            
            @media (max-width: 768px) {
                .table-container {
                    max-height: 60vh;
                }
                
                .scroll-to-top {
                    bottom: 80px;
                    right: 15px;
                    width: 45px;
                    height: 45px;
                    font-size: 16px;
                }
            }
            
            /* Melhorias para modo escuro */
            @media (prefers-color-scheme: dark) {
                .table-container::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.1);
                }
                
                .table-container::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.3);
                }
                
                .table-container::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.5);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    console.log('✅ Sistema v4.3 com scroll otimizado pronto para uso!');
    console.log('🎯 Recursos disponíveis:');
    console.log('   • Scroll infinito inteligente');
    console.log('   • Navegação por teclado (↑↓, Home, End, PgUp, PgDown)');
    console.log('   • Gestos touch para mobile');
    console.log('   • Busca com sugestões (Ctrl+K)');
    console.log('   • Atalhos: Alt+1/2/3 (abas), Esc (limpar), F5 (recarregar)');
    console.log('   • Performance otimizada com lazy loading');
});

// ========================================
// TRATAMENTO DE ERROS GLOBAL APRIMORADO
// ========================================
window.addEventListener('error', function(e) {
    console.error('❌ Erro global capturado:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack
    });
    
    // Tenta recuperar o sistema em caso de erro crítico
    if (e.message.includes('produtos') || e.message.includes('tabela')) {
        console.log('🔄 Tentando recuperar sistema após erro...');
        setTimeout(() => {
            try {
                carregarDadosAba(abaAtiva);
            } catch (recoveryError) {
                console.error('❌ Falha na recuperação:', recoveryError);
            }
        }, 1000);
    }
});

// ========================================
// DETECÇÃO DE CONEXÃO APRIMORADA
// ========================================
window.addEventListener('online', () => {
    console.log('🌐 Conexão restaurada');
    
    // Recarrega dados automaticamente
    setTimeout(() => {
        carregarDados().then(() => {
            // Mostra notificação de reconexão
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                animation: slideIn 0.3s ease;
            `;
            notification.innerHTML = '🌐 Conectado! Dados atualizados.';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 3000);
        });
    }, 1000);
});

window.addEventListener('offline', () => {
    console.log('📡 Modo offline detectado');
    
    // Mostra indicador de modo offline
    const offlineIndicator = document.createElement('div');
    offlineIndicator.id = 'offline-indicator';
    offlineIndicator.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #dc3545;
        color: white;
        text-align: center;
        padding: 10px;
        z-index: 9999;
        font-weight: bold;
    `;
    offlineIndicator.innerHTML = '📡 Modo Offline - Alguns recursos podem não funcionar';
    
    document.body.insertBefore(offlineIndicator, document.body.firstChild);
    
    // Remove indicador quando voltar online
    const removeOfflineIndicator = () => {
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.remove();
        window.removeEventListener('online', removeOfflineIndicator);
    };
    
    window.addEventListener('online', removeOfflineIndicator);
});

// ========================================
// LOG FINAL E INFORMAÇÕES DO SISTEMA
// ========================================
console.log('📜 Sistema de Consulta v4.3 carregado com sucesso!');
console.log('🎨 Melhorias implementadas:');
console.log('   ✅ Scroll suave e infinito');
console.log('   ✅ Performance otimizada');
console.log('   ✅ Navegação por teclado avançada');
console.log('   ✅ Suporte a gestos touch');
console.log('   ✅ Busca inteligente com sugestões');
console.log('   ✅ Tratamento de erros robusto');
console.log('   ✅ Estatísticas de uso');
console.log('   ✅ Modo offline inteligente');