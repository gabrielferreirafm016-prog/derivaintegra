# Derivaintegra (ES Module)

`derivaintegra` é uma biblioteca JavaScript pura para **derivação simbólica e integração** de equações matemáticas, agora otimizada como **ES Module (ESM)** moderno.

Ela recebe uma expressão como string (ex: `"x^2 * sin(x)"`) e retorna a string do resultado, juntamente com um construtor de passos (`StepsBuilder`) que gera um HTML da resolução passo a passo.

Este projeto foi construído como um parser descendente recursivo e **não possui dependências externas**.

## Instalação / Configuração

### Uso Local (Sem NPM)

Basta baixar o arquivo `derivaintegra_esm.js` e colocá-lo no seu projeto.

### Uso via NPM

```
npm install derivaintegra

```

> **Nota:** Certifique-se de que seu projeto está configurado como module (adicione `"type": "module"` no seu `package.json` ou use a extensão `.mjs`).

## Como Usar

### 1. Importando em Arquivos JavaScript (Local)

```
// Importe diretamente do arquivo
import { derivar, integrar, StepsBuilder } from './derivaintegra_esm.js';

// --- Exemplo de Derivação ---
const expressaoD = "cos(x^2)";
// Notações suportadas: 'lagrange' (f') ou 'leibniz' (d/dx)
const resultadoD = derivar(expressaoD, 'leibniz');

// A string da derivada final
console.log(resultadoD.derivadaStr);
// Saída: "-\sin(x^2) * (2x)"

// Renderizar passos (HTML)
console.log(resultadoD.stepsBuilder.render());

```

### 2. Diretamente no Navegador

Para usar no navegador sem bundlers (Webpack/Vite), utilize a tag `type="module"`.

```
<!DOCTYPE html>
<html>
<head>
    <title>Teste Derivaintegra</title>
    <!-- Opcional: KaTeX para renderizar a matemática visualmente -->
    <link rel="stylesheet" href="[https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css](https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css)">
    <script defer src="[https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js](https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js)"></script>
</head>
<body>
    <h3>Resultado:</h3>
    <div id="output"></div>

    <!-- Importante: type="module" -->
    <script type="module">
        import { integrar } from './derivaintegra_esm.js';

        const { integralStr, stepsBuilder } = integrar("x^2 * exp(x)");
        
        // Exibe o resultado
        console.log("Integral:", integralStr);
        
        // Renderiza os passos no HTML
        document.getElementById('output').innerHTML = stepsBuilder.render();
    </script>
</body>
</html>

```

## Regras e Funcionalidades Suportadas

### Derivação (`derivar`)

O motor de derivação suporta a **Regra da Cadeia** completa para funções aninhadas.

-   **Regras Básicas**: Constante ($c \to 0$), Variável ($x \to 1$), Potência ($ax^n$).
    
-   **Aritmética**: Regras da Soma, Subtração, Produto e Quociente.
    
-   **Trigonometria**: $\sin(u)$, $\cos(u)$, $\tan(u)$.
    
-   **Transcendentais**: $\ln(u)$, $e^u$ (`exp(u)`), $\sqrt{u}$.
    

### Integração (`integrar`)

O motor de integração aplica heurísticas para identificar o método de resolução mais adequado:

1.  **Integrais Imediatas**:
    
    -   Potência: $\int x^n dx$  
        
    -   Logarítmica: $\int \frac{1}{x} dx$  
        
    -   Exponencial: $\int e^x dx$  
        
    -   Trigonométrica: $\int \sin(x) dx$, $\int \cos(x) dx$  
        
2.  **Regra da Substituição (**$u$**-sub)**:
    
    -   Identifica automaticamente padrões da forma $\int f(g(x)) \cdot g'(x) dx$.
        
    -   Ex: $\int \cos(x^2) \cdot 2x dx$  
        
3.  **Integração por Partes (Recursiva)**:
    
    -   Resolve produtos de polinômios por funções transcendentais usando a regra LIATE.
        
    -   Ex: $\int x^2 \cdot \sin(x) dx$, $\int x \cdot e^x dx$.
        

## API (Funções Exportadas)

#### `derivar(expr: string, notation: string)`

Calcula a derivada da expressão.

-   `expr`: A expressão a ser derivada (ex: `"x^2 + sin(x)"`).
    
-   `notation`: `'leibniz'` (para `d/dx`) ou `'lagrange'` (para `f'(x)`).
    
-   **Retorna**: `{ derivadaStr: string, stepsBuilder: StepsBuilder }`
    

#### `integrar(expr: string)`

Calcula a integral (indefinida) da expressão.

-   `expr`: A expressão a ser integrada (ex: `"x * cos(x)"`).
    
-   **Retorna**: `{ integralStr: string, stepsBuilder: StepsBuilder }`
    
    -   _Nota: `integralStr` é a antiderivada simplificada._
        

#### `StepsBuilder`

Classe utilitária que armazena a árvore de resolução.

-   **Método `.render()`**: Retorna uma string HTML (`<div class="step">...</div>`) pronta para ser inserida na página.
    

## Licença

MIT
