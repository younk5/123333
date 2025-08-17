// Sistema de Consulta de Preços v2.0
// Arquivo: script.js

let produtos = [];
let configuracoes = {};
let metadados = {};

// Elementos DOM
const tabelaBody = document.getElementById("tabela-body");
const search = document.getElementById("search");
const marcaSelect = document.getElementById("marca");
const loading = document.getElementById("loading");
const produtosVisiveisEl = document.getElementById("produtos-visiveis");
const totalProdutosEl = document.getElementById("total-produtos");

let filtroTimeout;

// Função para carregar dados do arquivo JSON
async function carregarDados() {
    try {
        console.log('🔄 Carregando dados...');
        
        const response = await fetch('dados.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        
        // Armazenar dados globalmente
        produtos = dados.produtos || [];
        configuracoes = dados.configuracoes || {};
        metadados = dados.metadados || {};
        
        // Atualizar informações do sistema
        atualizarInterfaceComDados(dados);
        
        // Exibir produtos
        mostrarProdutos(produtos);
        esconderCarregamento();
        
        console.log('✅ Dados carregados com sucesso:', {
            produtos: produtos.length,
            versao: configuracoes.versao,
            empresa: configuracoes.empresa
        });
        
        // Atualizar select de marcas dinamicamente
        atualizarSelectMarcas();
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarErroCarregamento(error.message);
    }
}

// Atualizar interface com dados carregados
function atualizarInterfaceComDados(dados) {
    // Footer
    if (dados.configuracoes) {
        const footer = document.querySelector('.footer p');
        if (footer) {
            footer.textContent = 
                `🔧 ${dados.configuracoes.sistema || 'Sistema'} v${dados.configuracoes.versao || '1.0'} • ${dados.configuracoes.empresa || 'Tech Repairs'} • Última atualização: ${formatarData(dados.configuracoes.dataAtualizacao)}`;
        }
    }
    
    // Estatísticas
    if (totalProdutosEl) {
        totalProdutosEl.textContent = dados.produtos?.length || 0;
    }
    
    // Title da página
    if (dados.configuracoes?.sistema) {
        document.title = `📱 ${dados.configuracoes.sistema}`;
    }
}

// Atualizar select de marcas dinamicamente
function atualizarSelectMarcas() {
    const marcasUnicas = [...new Set(produtos.map(p => p.marca))];
    
    // Limpar opções existentes (exceto "Todas")
    while (marcaSelect.children.length > 1) {
        marcaSelect.removeChild(marcaSelect.lastChild);
    }
    
    // Adicionar marcas encontradas
    marcasUnicas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca;
        option.textContent = `📱 ${marca.charAt(0).toUpperCase() + marca.slice(1)}`;
        marcaSelect.appendChild(option);
    });
    
    console.log('🏷️ Marcas carregadas:', marcasUnicas);
}

// Mostrar loading
function mostrarCarregamento() {
    if (loading) loading.style.display = 'flex';
    if (tabelaBody) tabelaBody.style.display = 'none';
}

// Esconder loading
function esconderCarregamento() {
    if (loading) loading.style.display = 'none';
    if (tabelaBody) tabelaBody.style.display = '';
}

// Mostrar erro de carregamento
function mostrarErroCarregamento(mensagem = 'Erro desconhecido') {
    tabelaBody.innerHTML = `
        <tr>
            <td colspan="2">
                <div class="no-results">
                    <div class="no-results-icon">⚠️</div>
                    <h3>Erro ao carregar dados</h3>
                    <p>Detalhes: ${mensagem}</p>
                    <p>Verifique se o arquivo 'dados.json' está no mesmo diretório.</p>
                    <button onclick="carregarDados()" style="
                        margin-top: 16px;
                        padding: 12px 24px;
                        background: var(--primary);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='var(--primary-dark)'" 
                       onmouseout="this.style.background='var(--primary)'">
                        🔄 Tentar Novamente
                    </button>
                </div>
            </td>
        </tr>`;
    esconderCarregamento();
}

// Exibir produtos na tabela
function mostrarProdutos(lista) {
    tabelaBody.innerHTML = "";
    
    if (lista.length === 0) {
        tabelaBody.innerHTML = `
            <tr>
                <td colspan="2">
                    <div class="no-results">
                        <div class="no-results-icon">🔍</div>
                        <h3>Nenhum resultado encontrado</h3>
                        <p>Tente ajustar os filtros ou usar outros termos de busca</p>
                        <button onclick="limparFiltros()" style="
                            margin-top: 12px;
                            padding: 8px 16px;
                            background: var(--warning);
                            color: white;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">🗑️ Limpar Filtros</button>
                    </div>
                </td>
            </tr>`;
        if (produtosVisiveisEl) produtosVisiveisEl.textContent = "0";
        return;
    }

    lista.forEach((p, index) => {
        const row = document.createElement('tr');
        const statusIcon = p.disponivel ? '✅' : '❌';
        const statusClass = p.disponivel ? 'disponivel' : 'indisponivel';
        const statusText = p.disponivel ? 'Disponível' : 'Indisponível';
        
        row.innerHTML = `
            <td>
                <div class="produto-nome ${statusClass}">
                    ${statusIcon} ${p.nome}
                </div>
                <div class="produto-marca marca-${p.marca}">
                    ${p.marca.toUpperCase()}
                </div>
                <div class="produto-id">ID: ${p.id} • ${statusText}</div>
            </td>
            <td>
                <div class="produto-preco ${statusClass}">${p.preco}</div>
                <div class="produto-data">
                    📅 ${formatarData(p.dataAtualizacao)}
                </div>
            </td>
        `;
        
        // Efeito de animação
        row.style.opacity = '0';
        row.style.transform = 'translateY(10px)';
        tabelaBody.appendChild(row);
        
        // Animação de entrada escalonada
        setTimeout(() => {
            row.style.transition = 'all 0.3s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateY(0)';
        }, index * 50); // Delay baseado no índice
    });

    // Atualizar contador
    if (produtosVisiveisEl) {
        produtosVisiveisEl.textContent = lista.length;
    }
}

// Filtrar produtos
function filtrar() {
    clearTimeout(filtroTimeout);
    mostrarCarregamento();
    
    filtroTimeout = setTimeout(() => {
        const texto = search.value.toLowerCase().trim();
        const marca = marcaSelect.value;

        const filtrados = produtos.filter(p => {
            const condMarca = marca === "todas" || p.marca === marca;
            const condTexto = texto === "" || 
                             p.nome.toLowerCase().includes(texto) ||
                             p.id.toString().includes(texto) ||
                             p.preco.includes(texto);
            return condMarca && condTexto;
        });

        esconderCarregamento();
        mostrarProdutos(filtrados);
        
        // Log para debug
        console.log('🔍 Filtro aplicado:', {
            texto: texto || 'todos',
            marca: marca,
            resultados: filtrados.length
        });
        
    }, 200); // Reduzido para melhor responsividade
}

// Limpar filtros
function limparFiltros() {
    search.value = "";
    marcaSelect.value = "todas";
    search.focus();
    filtrar();
    console.log('🗑️ Filtros limpos');
}

// Formatar data
function formatarData(data) {
    if (!data) return 'N/A';
    
    try {
        const date = new Date(data);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch (error) {
        return data; // Retorna string original se não conseguir formatar
    }
}

// Buscar produto por ID
function buscarPorId(id) {
    const produto = produtos.find(p => p.id.toString() === id.toString());
    if (produto) {
        console.log('🎯 Produto encontrado:', produto);
        return produto;
    }
    console.log('❌ Produto não encontrado para ID:', id);
    return null;
}

// Estatísticas dos produtos
function obterEstatisticas() {
    const stats = {
        total: produtos.length,
        disponiveis: produtos.filter(p => p.disponivel).length,
        indisponiveis: produtos.filter(p => !p.disponivel).length,
        marcas: [...new Set(produtos.map(p => p.marca))],
        categorias: [...new Set(produtos.map(p => p.categoria))],
        precoMedio: calcularPrecoMedio()
    };
    
    console.log('📊 Estatísticas:', stats);
    return stats;
}

// Calcular preço médio (ignora produtos sem preço definido)
function calcularPrecoMedio() {
    const precosValidos = produtos
        .map(p => p.preco.replace('R$ ', '').replace(',', '.'))
        .filter(preco => preco !== '--' && !isNaN(parseFloat(preco)))
        .map(preco => parseFloat(preco));
    
    if (precosValidos.length === 0) return 0;
    
    const media = precosValidos.reduce((sum, preco) => sum + preco, 0) / precosValidos.length;
    return `R$ ${media.toFixed(2).replace('.', ',')}`;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando sistema...');
    
    // Mostrar loading inicial
    mostrarCarregamento();
    
    // Carregar dados
    carregarDados();
    
    // Focar no campo de busca
    if (search) search.focus();
    
    // Event listeners
    if (search) search.addEventListener("input", filtrar);
    if (marcaSelect) marcaSelect.addEventListener("change", filtrar);
});

// Atalhos de teclado
document.addEventListener('keydown', function(e) {
    // Ctrl+K para focar na busca
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        search.focus();
        console.log('⌨️ Atalho: Foco na busca');
    }
    
    // Escape para limpar filtros
    if (e.key === 'Escape') {
        limparFiltros();
        console.log('⌨️ Atalho: Filtros limpos');
    }
    
    // Ctrl+R para recarregar dados
    if (e.ctrlKey && e.key === 'r' && e.shiftKey) {
        e.preventDefault();
        mostrarCarregamento();
        carregarDados();
        console.log('⌨️ Atalho: Recarregando dados');
    }
});

// Função para debug - acessível via console
window.debugSistema = {
    produtos: () => produtos,
    stats: obterEstatisticas,
    buscarId: buscarPorId,
    recarregar: carregarDados,
    limpar: limparFiltros,
    config: () => configuracoes,
    meta: () => metadados
};

console.log('🔧 Sistema carregado! Use window.debugSistema para debug.');