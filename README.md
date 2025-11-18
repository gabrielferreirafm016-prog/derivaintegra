# Derivaintegra

`derivaintegra` é uma biblioteca JavaScript pura para **derivação simbólica e integração** de equações matemáticas.

Ela recebe uma expressão como string (ex: `"x^2 * sin(x)"`) e retorna a string do resultado (ex: `"2x \cdot \sin(x) + x^2 \cdot \cos(x)"`), juntamente com um construtor de passos (`StepsBuilder`) que gera um HTML da resolução passo a passo.

Este projeto foi construído como um parser descendente recursivo e não possui dependências externas.

## Instalação

```
npm install derivaintegra

```

## Como Usar

### 1. Em projetos Node.js ou Bundlers (React, Vue, etc.)

O pacote é um ES Module.

```
import { derivar, integrar, StepsBuilder, toKaTeX } from 'derivainteg';

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
const expressaoI = "5x^2 + 1/x";

const resultadoI = integrar(expressaoI);

// A string da integral final (sem o "+ C")
console.log(resultadoI.integralStr);
// Saída: "\frac{5}{3}x^3 + \cdot \ln|x|"

// HTML dos passos de integração (opcional)
const htmlPassosI = resultadoI.stepsBuilder.render();
// console.log(htmlPassosI);

// --- Exemplo de Utilitário ---
console.log(toKaTeX("sqrt(x^2 * 5)"));
// Saída: "\sqrt(x^2 \cdot 5)"

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
        // Carrega a biblioteca do CDN (use @latest ou fixe uma versão)
        import { derivar, integrar, StepsBuilder } from '[https://cdn.jsdelivr.net/npm/derivainteg@latest/derivaintegra.js](https://cdn.jsdelivr.net/npm/derivainteg@latest/derivaintegra.js)';

        // --- Derivação ---
        const { derivadaStr } = derivar("5x^2 + ln(x)", "lagrange");
        console.log("Derivada:", derivadaStr);
        // Saída: "10x + (1 / (x))"

        // --- Integração (com substituição u) ---
        const { integralStr, stepsBuilder } = integrar("cos(x^2) * 2x");
        console.log("Integral:", integralStr);
        // Saída: "(\sin((x^2)))"

        // Renderiza os passos da integral no HTML
        document.getElementById('output').innerHTML = stepsBuilder.render();
        
        /* Opcional: Se o KaTeX estiver carregado, você pode
           pedir para ele renderizar a matemática na página.
           
           document.addEventListener('DOMContentLoaded', () => {
               katex.renderMathInElement(document.body);
           });
        */
    </script>
</body>
</html>

```

## API (Funções Exportadas)

#### `derivar(expr: string, notation: string)`

Calcula a derivada da expressão.

-   `expr`: A expressão a ser derivada (ex: `"x^2 + sin(x)"`).
    
-   `notation`: `'leibniz'` (para `d/dx`) ou `'lagrange'` (para `f'(x)`).
    
-   **Retorna**: `{ derivadaStr: string, stepsBuilder: StepsBuilder }`
    

#### `integrar(expr: string)`

Calcula a integral (indefinida) da expressão. Tenta aplicar a Regra da Potência, integrais imediatas e a Regra da Substituição (u-sub).

-   `expr`: A expressão a ser integrada (ex: `"6x + cos(x)"`).
    
-   **Retorna**: `{ integralStr: string, stepsBuilder: StepsBuilder }`
    
    -   _Nota: `integralStr` é a antiderivada e não inclui o `+ C`._
        

#### `toKaTeX(expr: string)`

Uma função utilitária que converte uma expressão de entrada (ex: `sin(x) * 2`) para uma string formatada para KaTeX/LaTeX (ex: `\sin(x) \cdot 2`).

-   `expr`: A expressão de entrada.
    
-   **Retorna**: `string` formatada para KaTeX.
    

#### `StepsBuilder`

Uma classe que armazena os passos da resolução.

-   **Método `.render()`**: Retorna uma string HTML (`<div class="step">...</div>`) que descreve a resolução completa, pronta para ser injetada no DOM.
    

## Licença

MIT
