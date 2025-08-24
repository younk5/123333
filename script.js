// ========================================
// SISTEMA DE CONSULTA DE PREÇOS v4.2
// Com suporte a múltiplas categorias e JSON separados
// CORRIGIDO: Mostra % de desconto + Otimizações
// ========================================

// Variáveis globais
let produtos = [];
let abaAtiva = 'frontal';
let filtroTimeout;

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
// FUNÇÃO PARA ABRIR CONFIGURAÇÕES
// ========================================
function abrirConfiguracoes() {
    console.log('⚙️ Abrindo página de configurações...');
    window.location.href = 'config.html';
}

// ========================================
// FUNÇÃO PARA CALCULAR PREÇO COM DESCONTO APARENTE
// ========================================
function calcularPrecoComDesconto(precoOriginal) {
    // Carrega o percentual das configurações salvas
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
    
    // Remove símbolos de moeda e espaços para processar
    let valorLimpo = precoOriginal.replace(/[R$\s]/g, '').replace(',', '.');
    
    // Tenta extrair número decimal
    let valorNumerico = parseFloat(valorLimpo);
    
    if (isNaN(valorNumerico)) {
        // Tenta método alternativo se não conseguiu converter
        let match = precoOriginal.match(/[\d,]+/);
        if (match) {
            valorNumerico = parseFloat(match[0].replace(',', '.'));
        }
    }
    
    if (!isNaN(valorNumerico) && valorNumerico > 0) {
        // Calcula o preço final (com acréscimo)
        let precoFinal = valorNumerico * (1 + (percentualAcrescimo / 100));
        
        // Calcula qual seria o "desconto" para voltar ao preço original
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
    
    // Se não conseguir processar, retorna valores padrão
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
    console.log("📄 Carregando dados do sistema v4.2 com desconto aparente...");

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

            // Atualizar footer com informações do sistema
            if (footerInfo && dados.configuracoes) {
                const config = localStorage.getItem('configSistema');
                const empresaNome = config ? JSON.parse(config).empresaNome || dados.configuracoes.empresa : dados.configuracoes.empresa;
                const percentualAtual = config ? JSON.parse(config).percentualAcrescimo || '20' : '20';
                
                // Calcula o desconto equivalente para exibição
                const descontoEquivalente = Math.round(parseFloat(percentualAtual));

                
                footerInfo.innerHTML = `
                    🔧 ${dados.configuracoes.sistema} v${dados.configuracoes.versao} • 
                    ${empresaNome} • 
                    Atualizado em ${formatarData(dados.configuracoes.dataAtualizacao)} • 
                    <span style="color: #dc3545; font-weight: bold;">🏷️ Descontos até ${descontoEquivalente}%</span>
                `;
            }

        } catch (err) {
            console.error(`❌ Erro ao carregar ${arquivo}:`, err);
            mostrarErroCarregamento(`Erro em ${arquivo}: ${err.message}`);
            continue; // Continua com os outros arquivos
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
    
    // Remove opções existentes (exceto "todas")
    while (marcaSelect.children.length > 1) {
        marcaSelect.removeChild(marcaSelect.lastChild);
    }
    
    // Adiciona marcas
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
    // Previne erro se elementos não existirem
    const tabButtons = document.querySelectorAll('.tab-btn:not(.config-tab)');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Remove active de todas as abas
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Adiciona active na aba selecionada
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
    console.log(`📑 Aba alterada para: ${novaAba}`);
}

function carregarDadosAba(categoria) {
    const produtosDaCategoria = produtos.filter(p => p.categoria === categoria);
    
    switch(categoria) {
        case 'frontal': 
            mostrarProdutosTabela(produtosDaCategoria, tabelaFrontal, '📱 Frontal Original'); 
            break;
        case 'bateria': 
            mostrarProdutosTabela(produtosDaCategoria, tabelaBateria, '🔋 Bateria Original'); 
            break;
        case 'conector': 
            mostrarProdutosTabela(produtosDaCategoria, tabelaConector, '🔌 Conector Original'); 
            break;
        default:
            console.warn(`Categoria desconhecida: ${categoria}`);
    }
    
    // Aplica filtros existentes
    filtrar();
}

// ========================================
// TABELAS COM CONFIGURAÇÕES DINÂMICAS
// ========================================
function mostrarProdutosTabela(lista, tabelaEl, tipo) {
    if (!tabelaEl) {
        console.warn('Elemento da tabela não encontrado');
        return;
    }
    
    tabelaEl.innerHTML = "";
    
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

    // Carrega configurações de exibição
    let mostrarPrecoOriginal = true;
    let destacarDesconto = true;
    
    try {
        const configSalva = localStorage.getItem('configSistema');
        if (configSalva) {
            const config = JSON.parse(configSalva);
            mostrarPrecoOriginal = config.mostrarPrecoOriginal !== false;
            destacarDesconto = config.destacarAcrescimo !== false; // Mantém a mesma configuração
        }
    } catch (error) {
        console.warn('⚠️ Erro ao carregar configurações de exibição:', error);
    }

    lista.forEach((produto, index) => {
        const row = document.createElement('tr');
        const statusIcon = produto.disponivel !== false ? '✅' : '❌';
        const statusClass = produto.disponivel !== false ? 'status-available' : 'status-unavailable';
        
        // Calcula preços com desconto aparente
        const precoData = calcularPrecoComDesconto(produto.preco || 'R$ 0,00');
        
        // Monta a exibição do preço
        let precoHTML = `<div style="font-weight: bold; color: #28a745; font-size: 1.1em;">${precoData.precoFinalFormatado}</div>`;
        
        if (mostrarPrecoOriginal && precoData.precoOriginal > 0) {
            precoHTML += `<div style="font-size: 0.9em; color: #6c757d; text-decoration: line-through;">Desconto: ${precoData.precoOriginalFormatado}</div>`;
        }
        
        if (destacarDesconto && precoData.percentualDesconto > 0) {
            precoHTML += `<div style="font-size: 0.8em; color: #dc3545; font-weight: bold;">🏷️ ${precoData.percentualDesconto}% OFF</div>`;
        }
        
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
        
        tabelaEl.appendChild(row);
        
        // Animação de entrada (com verificação de erro)
        try {
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            setTimeout(() => {
                row.style.transition = 'all 0.4s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
        } catch (animError) {
            // Se animação falhar, apenas mostra o elemento
            row.style.opacity = '1';
        }
    });

    atualizarContadorVisivel(lista.length);
}

// ========================================
// FILTROS
// ========================================
function filtrar() {
    // Limpa timeout anterior para evitar múltiplas execuções
    clearTimeout(filtroTimeout);
    
    filtroTimeout = setTimeout(() => {
        const texto = search ? search.value.toLowerCase().trim() : '';
        const marca = marcaSelect ? marcaSelect.value : 'todas';
        const produtosDaCategoria = produtos.filter(p => p.categoria === abaAtiva);

        const filtrados = produtosDaCategoria.filter(produto => {
            // Filtro por marca
            const condMarca = marca === "todas" || produto.marca === marca;
            
            // Filtro por texto (busca em múltiplos campos)
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

        // Atualiza tabela correspondente
        switch(abaAtiva) {
            case 'frontal': 
                mostrarProdutosTabela(filtrados, tabelaFrontal, '📱 Frontal Original'); 
                break;
            case 'bateria': 
                mostrarProdutosTabela(filtrados, tabelaBateria, '🔋 Bateria Original'); 
                break;
            case 'conector': 
                mostrarProdutosTabela(filtrados, tabelaConector, '🔌 Conector Original'); 
                break;
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
    const tabelaAtiva = document.querySelector(`#tabela-${abaAtiva}`);
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
            
            // Aplicar configurações de interface
            if (config.animacoesInterface === false) {
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
// EVENT LISTENERS E INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sistema de Consulta v4.2 inicializando...');
    
    // Carrega dados iniciais
    carregarDados();
    
    // Aplica configurações salvas
    aplicarConfiguracoesSalvas();
    
    // Inicia monitoramento
    monitorarConfiguracoes();
    
    // Event listeners
    if (search) {
        search.addEventListener("input", filtrar);
        // Foco no campo de busca após carregamento
        setTimeout(() => search.focus(), 2000);
    }
    
    if (marcaSelect) {
        marcaSelect.addEventListener("change", filtrar);
    }
    
    // Atalhos de teclado
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
            
            // ESC ou Alt+C para limpar filtros
            if (e.key === 'Escape' || (e.altKey && e.key === 'c')) { 
                limparFiltros(); 
            }
            
            // F5 ou Ctrl+Shift+R para recarregar dados
            if (e.key === 'F5' || (e.ctrlKey && e.shiftKey && e.key === 'R')) { 
                e.preventDefault(); 
                carregarDados(); 
            }
            
            // Ctrl+R para recarregar (sem shift)
            if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
                e.preventDefault();
                carregarDados();
            }
        } catch (error) {
            console.warn('⚠️ Erro no atalho de teclado:', error);
        }
    });
    
    console.log('✅ Sistema v4.2 pronto para uso!');
});

// ========================================
// TRATAMENTO DE ERROS GLOBAL
// ========================================
window.addEventListener('error', function(e) {
    console.error('❌ Erro global capturado:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

// ========================================
// DETECÇÃO DE CONEXÃO
// ========================================
window.addEventListener('online', () => {
    console.log('🌐 Conexão restaurada');
    setTimeout(() => carregarDados(), 1000);
});

window.addEventListener('offline', () => {
    console.log('📡 Modo offline');
    const statusContainer = document.querySelector('.status-container');
    if (statusContainer) {
        statusContainer.innerHTML = '<div style="color: #dc3545;">📡 Modo Offline</div>';
    }
});

// Log final
console.log('📜 Sistema de Consulta v4.2 carregado com sucesso');