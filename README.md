# Derivaintegra

`derivaintegra` é uma biblioteca JavaScript pura para **derivação simbólica e integração** de equações matemáticas.

Ela recebe uma expressão como string (ex: `"x^2 * sin(x)"`) e retorna a string do resultado (ex: `"-x^2 \cdot \cos(x) + 2x \cdot \sin(x) + 2 \cdot \cos(x)"`), juntamente com um construtor de passos (`StepsBuilder`) que gera um HTML da resolução passo a passo.

Este projeto foi construído como um parser descendente recursivo e não possui dependências externas.

## Instalação

```
npm install derivaintegra

```

## Como Usar

### 1. Em projetos Node.js ou Bundlers (React, Vue, etc.)

O pacote é um ES Module.

```
import { derivar, integrar, StepsBuilder, toKaTeX } from 'derivaintegra';

// --- Exemplo de Derivação ---
const expressaoD = "cos(x^2)";
const notacao = "lagrange"; // 'lagrange' (f') ou 'leibniz' (d/dx)

const resultadoD = derivar(expressaoD, notacao);

// A string da derivada final
console.log(resultadoD.derivadaStr);
// Saída: "-\sin(x^2) * (2x)"

// HTML dos passos de derivação (opcional)
const htmlPassosD = resultadoD.stepsBuilder.render();
// console.log(htmlPassosD);


// --- Exemplo de Integração ---
const expressaoI = "x * sin(x)";

const resultadoI = integrar(expressaoI);

// A string da integral final (sem o "+ C")
console.log(resultadoI.integralStr);
// Saída: "-x \cdot \cos(x) + \sin(x)"

// HTML dos passos de integração (opcional)
const htmlPassosI = resultadoI.stepsBuilder.render();

```

### 2. Diretamente no Navegador (via CDN)

Você pode carregar a biblioteca diretamente de um CDN como o jsDelivr.

```
<!DOCTYPE html>
<html>
<head>
    <title>Teste Derivaintegra</title>
    <!-- Opcional: KaTeX para renderizar a matemática -->
    <link rel="stylesheet" href="[https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css](https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css)">
    <script defer src="[https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js](https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.js)"></script>
</head>
<body>
    <h3>Passos da Integração:</h3>
    <div id="output"></div>

    <script type="module">
        import { derivar, integrar } from '[https://cdn.jsdelivr.net/npm/derivaintegra@latest/derivaintegra.js](https://cdn.jsdelivr.net/npm/derivaintegra@latest/derivaintegra.js)';

        const { integralStr, stepsBuilder } = integrar("x^2 * exp(x)");
        
        // Renderiza os passos da integral no HTML
        document.getElementById('output').innerHTML = stepsBuilder.render();
    </script>
</body>
</html>

```

## Regras e Funcionalidades Suportadas

### Derivação

O motor de derivação suporta a **Regra da Cadeia** completa para funções aninhadas.

-   **Regras Básicas**: Constante ($c \to 0$), Variável ($x \to 1$), Potência ($ax^n$).
    
-   **Aritmética**: Regras da Soma, Subtração, Produto e Quociente.
    
-   **Trigonometria**: $\sin(u)$, $\cos(u)$, $\tan(u)$.
    
-   **Transcendentais**: $\ln(u)$, $e^u$ (`exp(u)`), $\sqrt{u}$.
    

### Integração

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
        
    -   Suporta recursão para polinômios de grau superior.
        
    -   Ex: $\int x^2 \cdot \sin(x) dx$, $\int x \cdot e^x dx$.
        
4.  **Álgebra**:
    
    -   Distribuição de constantes e simplificação de sinais nos resultados finais.
        

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
        

#### `toKaTeX(expr: string)`

Converte uma expressão linear para o formato LaTeX, otimizado para o KaTeX.

-   **Retorna**: `string` formatada (ex: `sin(x) * 2` $\to$ `\sin(x) \cdot 2`).
    

#### `StepsBuilder`

Classe utilitária que armazena a árvore de resolução.

-   **Método `.render()`**: Retorna HTML (`<div class="step">...</div>`).
    
-   **Método `.printToConsole()`**: Imprime a árvore de passos colorida no console do navegador para depuração.
    

## Licença

MIT
