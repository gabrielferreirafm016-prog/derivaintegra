// --- A Biblioteca (derivainteg.js) ---
// Este arquivo contém toda a lógica e pode ser publicado no NPM.
// Ele não contém nenhum código de UI (DOM)
// -----------------------------------------------------------

/**
 * Construtor para o passo-a-passo.
 * Esta classe é exportada para que o protótipo possa chamar .render()
 */
export class StepsBuilder {
    constructor() {
        this.steps = [];
        this.isIntegral = false; 
    }
    addStep(title, explanation, formula, calculo) { this.steps.push({ title, explanation, formula, calculo }); }
    addNestedSteps(title, nestedBuilder) { this.steps.push({ title, nestedBuilder }); }
    render() {
        if (this.steps.length === 0) return "Nenhum passo gerado.";
        const integralClass = this.isIntegral ? 'integral' : '';
        return this.steps.map((step, index) => {
            let html = `<div class="step">`;
            html += `<div class="step-title ${integralClass}">${index + 1}. ${step.title}</div>`;
            if (step.nestedBuilder) {
                html += `<div style="padding-left: 20px; border-left: 2px solid ${this.isIntegral ? '#008a00' : '#0078d4'}; margin-top: 10px;">`;
                html += step.nestedBuilder.render();
                html += `</div>`;
            } else {
                html += `<ul class="${integralClass}">`;
                if (step.explanation) html += `<li>${step.explanation}</li>`;
                if (step.formula) html += `<li>Fórmula: $${step.formula}$</li>`;
                if (step.calculo) html += `<li>Cálculo: $${step.calculo}$</li>`;
                html += `</ul>`;
            }
            html += `</div>`;
            return html;
        }).join('');
    }
}

// --- Funções Auxiliares (Internas) ---

function wrapIfNeeded(term) {
    let parenCount = 0;
    for (let i = 0; i < term.length; i++) {
        if (term[i] === '(') parenCount++;
        if (term[i] === ')') parenCount--;
        if (parenCount === 0 && (term[i] === '+' || (term[i] === '-' && i > 0))) {
            return `(${term})`;
        }
    }
    return term;
}

/**
 * Converte a string de entrada para uma string KaTeX (LaTeX).
 * Exportado para que o protótipo possa formatar a entrada.
 */
export function toKaTeX(str) { 
    let katexStr = str.replace(/\s+/g, ' '); // Mantenha um único espaço
    
    // 1. Substitui funções (sin, cos, etc.) globalmente
    katexStr = katexStr.replace(/\b(sin|cos|tan|ln|sqrt)\(/g, "\\$1(");
    
    // 2. Substitui exp(...) por e^{...}
    katexStr = katexStr.replace(/exp\(([^)]+)\)/g, (match, content) => {
        if (content.match(/^-?([\d\.]*x(\^[\d\.-]+)?|[\d\.]+)$/)) {
            return `e^{${content}}`;
        }
        return `e^{(${content})}`;
    });

    // 3. Substitui e^(...) por e^{...}
    katexStr = katexStr.replace(/e\^\(([^)]+)\)/g, "e^{$1}");

    // 4. Substitui * por \cdot (com espaços para não juntar)
    katexStr = katexStr.replace(/\s*\*\s*/g, " \\cdot ");
    
    return katexStr;
}

/**
 * Simplifica a expressão algébrica bruta.
 * Interna da biblioteca.
 */
function simplifyExpression(expr) {
    let simplified = expr;
    let lastExpr;
    do {
        lastExpr = simplified;
        
        // Remove parênteses duplos, ex: ((x^3)) -> (x^3)
        simplified = simplified.replace(/\(\(([^()]+)\)\)/g, '($1)');

        // Simplificações existentes
        simplified = simplified.replace(/(?<!\\?(?:sin|cos|tan|sqrt|ln|exp))\(([^()]+)\)/g, (match, content) => { if (content.match(/^-?([\d\.]*x(\^[\d\.-]+)?|[\d\.]+)$/)) { return content; } return match; });
        simplified = simplified.replace(/([^*\/+\-\s])\s*\*\s*\((-[^()]+)\)/g, '- $1 * $2');
        simplified = simplified.replace(/\((-[^()]+)\)\s*\*\s*([^*\/+\-\s])/g, '- $1 * $2');
        simplified = simplified.replace(/\+\s*-\s*/g, '- ');
        simplified = simplified.replace(/-\s*-\s*/g, '+ ');
        
        // Simplifica multiplicação por 0: (qualquercoisa * 0) -> 0
        simplified = simplified.replace(/([^\s()]*|\([^)]+\))\s*\*\s*0/g, '0');
        simplified = simplified.replace(/0\s*\*\s*([^\s()]*|\([^)]+\))/g, '0');

        // Simplifica soma com 0: (qualquercoisa + 0) -> qualquercoisa
        simplified = simplified.replace(/\+\s*0/g, '');
        simplified = simplified.replace(/0\s*\+/g, '');

        simplified = simplified.replace(/-\s*\((.+?)\s*\+\s*(.+?)\)/g, '- $1 - $2');
        simplified = simplified.replace(/-\s*\((.+?)\s*-\s*(.+?)\)/g, '- $1 + $2');
        simplified = simplified.replace(/-\s*\(([^\(\)]+)\)/g, (match, content) => { if (content.match(/^(\\?(sin|cos|tan|sqrt)|ln|exp)\(.*\)$/)) { return `- ${content}`; } if (!content.includes('+') && !content.includes('-') && !content.includes('*') && !content.includes('/')) { return `- ${content}`; } return match; });
        simplified = simplified.replace(/\s+/g, ' ').trim();
    } while (simplified !== lastExpr);
    
    // Remove parênteses externos (ex: (exp(x^3)) -> exp(x^3))
    if (simplified.startsWith('(') && simplified.endsWith(')')) {
        let parenCount = 0; let valid = true;
        for (let i = 0; i < simplified.length - 1; i++) { if (simplified[i] === '(') parenCount++; if (simplified[i] === ')') parenCount--; if (parenCount === 0) { valid = false; break; } }
        if (valid) { simplified = simplified.substring(1, simplified.length - 1); }
    }

    return simplified;
}

// --- BLOCO 2: Motor de Derivação (Interno e Exportado) ---

/**
 * Função principal de Derivação.
 * @param {string} expr A expressão a ser derivada.
 * @param {string} notation 'lagrange' (f') ou 'leibniz' (d/dx).
 * @returns {object} { derivadaStr: string, stepsBuilder: StepsBuilder }
 */
export function derivar(expr, notation) {
    const stepsBuilder = new StepsBuilder();
    let d_final = "";
    let expr_str_limpa = expr.replace(/\s+/g, '');
    if (!expr_str_limpa) return { derivadaStr: "0", stepsBuilder };
    const result = derivarExpressao(expr_str_limpa, stepsBuilder, notation);
    
    stepsBuilder.addStep("União dos Resultados", "Juntando todos os resultados parciais...", `f'(x) = ${result.derivadaStr}`, null);
    
    // Simplifica a string final
    d_final = simplifyExpression(result.derivadaStr);
    
    return { derivadaStr: d_final, stepsBuilder: stepsBuilder };
}

// Funções internas de derivação (não exportadas)
function derivarExpressao(expr, parentSteps, notation) {
    let d_final = "";
    let termos = []; let operadores = []; let parenCount = 0; let start = 0;
    for (let i = 0; i < expr.length; i++) {
        const char = expr[i]; if (char === '(') parenCount++; if (char === ')') parenCount--;
        if (parenCount === 0 && (char === '+' || char === '-')) {
            if (i > 0 || (char === '+' && start === 0)) { 
                if (i > 0) { 
                    termos.push(expr.substring(start, i)); 
                    operadores.push(char); 
                }
                start = i + 1; 
            }
        }
    }
    termos.push(expr.substring(start));
    
    if (termos.length === 1 && operadores.length === 0) {
         return derivarTermo(expr, parentSteps, notation);
    }
    
    let formula, calculo;
    if (notation === 'leibniz') { formula = `\\frac{d}{dx}(u \u00B1 v) = \\frac{d}{dx}(u) \u00B1 \\frac{d}{dx}(v)`; calculo = `\\text{Aplicando a } \\frac{d}{dx}(${toKaTeX(expr)})`; }
    else { formula = `(u \u00B1 v)' = u' \u00B1 v'`; calculo = `\\text{Aplicando a } (${toKaTeX(expr)})'`; }
    parentSteps.addStep( "Regra da Soma/Subtração", "A derivada de uma soma/subtração é a soma/subtração das derivadas.", formula, calculo);
    
    let derivadasTermos = [];
    for (let i = 0; i < termos.length; i++) {
        const termo = termos[i]; if(termo === "") continue;
        
        const nestedSteps = new StepsBuilder(); 
        nestedSteps.isIntegral = parentSteps.isIntegral;
        
        const result = derivarTermo(termo, nestedSteps, notation);
        derivadasTermos.push(result.derivadaStr);
        
        const title = (notation === 'leibniz') ? `Derivando $\\frac{d}{dx}(${toKaTeX(termo)})$:` : `Derivando $(${toKaTeX(termo)})'$:`;
        parentSteps.addNestedSteps(title, result.stepsBuilder);
    }
    d_final = derivadasTermos[0] || "";
    for (let i = 0; i < operadores.length; i++) { if(derivadasTermos[i+1]) { d_final += ` ${operadores[i]} ${derivadasTermos[i + 1]}`; } }
    return { derivadaStr: d_final, stepsBuilder: parentSteps };
}
function derivarTermo(expr, parentSteps, notation) {
    let parenCount = 0;
    for (let i = expr.length - 1; i >= 0; i--) {
        const char = expr[i]; if (char === ')') parenCount++; if (char === '(') parenCount--;
        if (parenCount === 0 && (char === '*' || char === '/' || char === '.')) {
            const u = expr.substring(0, i); const v = expr.substring(i + 1); const op = char;
            if(!u || !v) continue;
            
            const u_nested_steps = new StepsBuilder(); u_nested_steps.isIntegral = parentSteps.isIntegral;
            const v_nested_steps = new StepsBuilder(); v_nested_steps.isIntegral = parentSteps.isIntegral;
            
            const u_result = derivarFator(u, u_nested_steps, notation);
            const v_result = derivarFator(v, v_nested_steps, notation);
            
            const du_str = u_result.derivadaStr; const dv_str = v_result.derivadaStr;
            const u_wrapped = wrapIfNeeded(u); const v_wrapped = wrapIfNeeded(toKaTeX(v));
            const du_wrapped = wrapIfNeeded(du_str); const dv_wrapped = wrapIfNeeded(dv_str);
            
            let d_final = ''; let formula = ''; let calculo = ''; let u_deriv_str, v_deriv_str;

            if (op === '*' || op === '.') {
                d_final = `(${du_wrapped} * ${v_wrapped} + ${u_wrapped} * ${dv_wrapped})`;
                if (notation === 'leibniz') { formula = `\\frac{d}{dx}(u \\cdot v) = \\frac{d}{dx}(u)v + u\\frac{d}{dx}(v)`; u_deriv_str = `... = ${du_str}`; v_deriv_str = `... = ${dv_str}`; }
                else { formula = `(u \\cdot v)' = u'v + uv'`; u_deriv_str = `u' = ${du_str}`; v_deriv_str = `v' = ${dv_str}`; }
                calculo = `u = ${u}, v = ${v} \\\\ ${u_deriv_str}, ${v_deriv_str} \\\\ \\text{Res} = ${du_wrapped} \\cdot ${v_wrapped} + ${u_wrapped} \\cdot ${dv_wrapped}`;
                parentSteps.addStep("Regra do Produto", "Aplicando a regra do produto.", formula, calculo);
            } else {
                d_final = `((${du_wrapped} * ${v_wrapped} - ${u_wrapped} * ${dv_wrapped}) / (${v_wrapped})^2)`;
                if (notation === 'leibniz') { formula = `\\frac{d}{dx}(\\frac{u}{v}) = \\frac{\\frac{d}{dx}(u)v - u\\frac{d}{dx}(v)}{v^2}`; u_deriv_str = `... = ${du_str}`; v_deriv_str = `... = ${dv_str}`; }
                else { formula = `(\\frac{u}{v})' = \\frac{u'v - uv'}{v^2}`; u_deriv_str = `u' = ${du_str}`; v_deriv_str = `v' = ${dv_str}`; }
                calculo = `u = ${u}, v = ${v} \\\\ ${u_deriv_str}, ${v_deriv_str} \\\\ \\text{Res} = \\frac{${du_wrapped} \\cdot ${v_wrapped} - ${u_wrapped} \\cdot ${dv_wrapped}}{(${v_wrapped})^2}`;
                parentSteps.addStep("Regra do Quociente", "Aplicando a regra do quociente.", formula, calculo);
            }
            const title_u = (notation === 'leibniz') ? `Cálculo de $\\frac{d}{dx}(${toKaTeX(u)})$:` : `Cálculo de $u'$:`;
            const title_v = (notation === 'leibniz') ? `Cálculo de $\\frac{d}{dx}(${toKaTeX(v)})$:` : `Cálculo de $v'$:`;
            parentSteps.addNestedSteps(title_u, u_result.stepsBuilder);
            parentSteps.addNestedSteps(title_v, v_result.stepsBuilder);
            return { derivadaStr: d_final, stepsBuilder: parentSteps };
        }
    }
    return derivarFator(expr, parentSteps, notation);
}
function derivarFator(expr, parentSteps, notation) {
    if (!isNaN(parseFloat(expr)) && isFinite(expr) && !expr.toLowerCase().includes('x')) { 
        parentSteps.addStep("Regra da Constante", "A derivada de uma constante (c) é 0.", `(c)' = 0`, `(${expr})' = 0`); 
        return { derivadaStr: "0", stepsBuilder: parentSteps }; 
    }
    if (expr === 'x') { 
        parentSteps.addStep("Regra da Variável", "A derivada de x (em relação a x) é 1.", `(x)' = 1`, `(${expr})' = 1`); 
        return { derivadaStr: "1", stepsBuilder: parentSteps }; 
    }
    let match = expr.match(/^(-?[\d\.]*)x(\^([\d\.-]+))?$/);
    if (match) {
        let a = match[1]; let n = match[3]; if (a === "") a = "1"; if (a === "-") a = "-1"; if (n === undefined) n = "1";
        const a_val = parseFloat(a); const n_val = parseFloat(n);
        const novo_a = a_val * n_val; const novo_n = n_val - 1;
        let d_final = "";
        if (novo_a === 0) { d_final = "0"; }
        else if (novo_n === 0) { d_final = `${novo_a}`; }
        else if (novo_n === 1) { d_final = `${novo_a === 1 ? '' : (novo_a === -1 ? '-' : novo_a)}x`; }
        else { d_final = `${novo_a === 1 ? '' : (novo_a === -1 ? '-' : novo_a)}x^${novo_n}`; }
        parentSteps.addStep("Regra da Potência", "Aplicando a regra (ax^n)' = anx^{n-1}.", `(ax^n)' = anx^{n-1}`, `a=${a_val}, n=${n_val} \\\\ ${a_val} \\cdot ${n_val}x^{${n_val}-1} = ${d_final}`);
        return { derivadaStr: d_final, stepsBuilder: parentSteps };
    }
    if (expr.startsWith('(') && expr.endsWith(')')) {
        let parenCount = 0; let valid = true;
        for (let i = 0; i < expr.length -1; i++) { if (expr[i] === '(') parenCount++; if (expr[i] === ')') parenCount--; if (parenCount === 0) { valid = false; break; } }
        if (parenCount !== 1) valid = false;
        
        if (valid) {
            const innerExpr = expr.substring(1, expr.length - 1);
            const nestedSteps = new StepsBuilder(); nestedSteps.isIntegral = parentSteps.isIntegral;
            const innerResult = derivarExpressao(innerExpr, nestedSteps, notation);
            parentSteps.addStep("Regra dos Parênteses", "A derivada de (f(x)) é a derivada do conteúdo interno.", "", `Derivando ${innerExpr}`);
            parentSteps.addNestedSteps("Passos internos:", innerResult.stepsBuilder);
            return { derivadaStr: `(${innerResult.derivadaStr})`, stepsBuilder: parentSteps };
        }
    }
    match = expr.match(/^(sin|cos|tan|ln|exp|sqrt)\((.+)\)$/);
    if (match) {
        const func = match[1]; const innerExpr = match[2];
        let parenCount = 0;
        for(let char of innerExpr) { if (char === '(') parenCount++; if (char === ')') parenCount--; }
        if (parenCount !== 0) {
            parentSteps.addStep("Erro", `Parênteses desbalanceados em: ${expr}`, "", "");
            return { derivadaStr: `[Erro em '${expr}']`, stepsBuilder: parentSteps };
        }
        
        const nestedSteps = new StepsBuilder(); nestedSteps.isIntegral = parentSteps.isIntegral;
        const innerResult = derivarExpressao(innerExpr, nestedSteps, notation); const inner_d_str = innerResult.derivadaStr;
        let d_func_u = ""; let d_final = ""; let formula = "";
        switch (func) {
            case 'sin': d_func_u = `\\cos(${toKaTeX(innerExpr)})`; formula = `(\\sin(u))' = \\cos(u) \\cdot u'`; break;
            case 'cos': d_func_u = `-\\sin(${toKaTeX(innerExpr)})`; formula = `(\\cos(u))' = -\\sin(u) \\cdot u'`; break;
            case 'tan': d_func_u = `(1 / (\\cos(${toKaTeX(innerExpr)}))^2)`; formula = `(\\tan(u))' = \\sec^2(u) \\cdot u'`; break;
            case 'ln': d_func_u = `(1 / (${toKaTeX(innerExpr)}))`; formula = `(\\ln(u))' = \\frac{1}{u} \\cdot u'`; break;
            case 'exp': d_func_u = `exp(${toKaTeX(innerExpr)})`; formula = `(e^u)' = e^u \\cdot u'`; break;
            case 'sqrt': d_func_u = `(1 / (2 * \\sqrt(${toKaTeX(innerExpr)})))`; formula = `(\\sqrt(u))' = \\frac{1}{2\\sqrt{u}} \\cdot u'`; break;
        }
        d_final = `${d_func_u}`;
        if (innerExpr !== 'x' && inner_d_str !== '1') { d_final += ` * (${inner_d_str})`; }
        parentSteps.addStep(`Regra da Cadeia (${func})`, `u = ${toKaTeX(innerExpr)}`, formula, `Res = ${d_final}`);
        parentSteps.addNestedSteps(`Cálculo de $u'$:`, innerResult.stepsBuilder);
        return { derivadaStr: d_final, stepsBuilder: parentSteps };
    }
    parentSteps.addStep("Erro", `Termo não reconhecido: ${expr}`, "", "");
    return { derivadaStr: `[Erro: ${expr}]`, stepsBuilder: parentSteps };
}

// --- BLOCO 3: Motor de Integração (Interno e Exportado) ---

/**
 * Função principal de Integração.
 * @param {string} expr A expressão a ser integrada.
 * @returns {object} { integralStr: string, stepsBuilder: StepsBuilder }
 */
export function integrar(expr) {
    let exprLimpa = expr.replace(/\s+/g, '');
    let termos = [];
    let operadores = ['+']; 
    let parenCount = 0;
    let start = 0;

    for (let i = 0; i < exprLimpa.length; i++) {
        const char = exprLimpa[i];
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        if (parenCount === 0 && (char === '+' || char === '-')) {
            if (i > 0) { 
                termos.push(exprLimpa.substring(start, i));
                operadores.push(char);
                start = i + 1;
            } else if (char === '-' && i === 0) {
                 start = 1;
                 operadores[0] = '-';
            }
        }
    }
    termos.push(exprLimpa.substring(start));
    
    // --- LÓGICA DE STEPS ---
    const mainStepsBuilder = new StepsBuilder();
    mainStepsBuilder.isIntegral = true;
    let finalIntegralTerms = []; 
    
    mainStepsBuilder.addStep(
        "Regra da Soma (Integração)",
        "A integral da soma é a soma das integrais de cada termo.",
        "\\int (f(x) + g(x)) dx = \\int f(x) dx + \\int g(x) dx",
        `Separando a expressão: $\\int ${toKaTeX(expr)} dx$`
    );

    for (let i = 0; i< termos.length; i++) {
        let termo = termos[i];
        if (!termo) continue;
        
        let sinal = operadores[i];
        let termoOriginal = (sinal === '+' ? (i>0 ? ' + ' : '') : ' - ') + termo;
        if(sinal === '-') termo = '-' + termo;

        let sinalOperador = (sinal === '-' ? ' - ' : ' + ');
        if (i === 0 && sinal === '+') sinalOperador = '';
        
        const nestedSteps = new StepsBuilder();
        nestedSteps.isIntegral = true;
        
        const { integralStr: termoResultStr } = analisarEIntegrarTermo(termo, nestedSteps);
        
        finalIntegralTerms.push(sinalOperador + termoResultStr); 
        
        mainStepsBuilder.addNestedSteps(
            `Integrando o termo: $${toKaTeX(termoOriginal)} dx$`,
            nestedSteps
        );
    }
    
    // --- Monta o resultado final ---
    let rawIntegralStr = finalIntegralTerms.join('').trim(); 
    if (rawIntegralStr.startsWith(' + ')) rawIntegralStr = rawIntegralStr.substring(3);
    
    console.log("--- PROCESSO DE CÁLCULO (Antes de Simplificar) ---");
    console.log(rawIntegralStr);
    
    let finalIntegralStr_raw = simplifyExpression(rawIntegralStr); 
    
    console.log("--- RESULTADO DE SAÍDA (Final, sem +C) ---");
    console.log(finalIntegralStr_raw);

    // Retorna a string simplificada e os passos.
    // O protótipo cuidará de adicionar "+ C" e formatar o KaTeX.
    return {
        integralStr: finalIntegralStr_raw,
        stepsBuilder: mainStepsBuilder
    };
}


// Funções internas de integração (não exportadas)
function integrarTermoSimples(expr, variable = 'x', parentSteps = null) {
    const addStep = (title, exp, f, c) => { if (parentSteps) { parentSteps.isIntegral = true; parentSteps.addStep(title, exp, f, c); } };
    const v = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Caso 1: Constante
    if (!isNaN(parseFloat(expr)) && isFinite(expr) && !expr.toLowerCase().includes(variable)) {
        const c = expr; const i_final = (c === '0') ? '0' : `${c}${variable}`;
        if(c === '0') { addStep("Integral de Zero", "A integral de 0 é 0.", `\\int 0 d${v} = 0`, ``); return { integralStr: '0' }; }
        addStep("Regra da Constante (Int.)", "A integral de uma constante 'c' é 'cv'.", `\\int c d${v} = c${v}`, `\\int ${c} d${v} = ${i_final}`);
        return { integralStr: i_final };
    }
    
    // Caso 2: Regra da Potência (ax^n)
    const potRegex = new RegExp(`^(-?[\\d\\.]*)${v}(\\^([\\d\\.-]+))?$`);
    let match = expr.match(potRegex);
    if (match) {
        let a = match[1]; let n = match[3]; if (a === "") a = "1"; if (a === "-") a = "-1"; if (n === undefined) n = "1";
        const a_val = parseFloat(a); const n_val = parseFloat(n);
        
        // Caso 2a: Regra do Logaritmo (ax^-1 ou a/x)
        if (n_val === -1) {
            const i_final = `${a_val === 1 ? '' : (a_val === -1 ? '-' : a_val)} \\cdot \\ln|${variable}|`;
            addStep("Regra do Logaritmo (Int.)", "A integral de a/v é a*ln|v|.", `\\int \\frac{a}{${v}} d${v} = a \\cdot \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
            return { integralStr: i_final };
        }
        
        // Caso 2b: Regra da Potência Geral
        const novo_n = n_val + 1; const novo_a = (a_val / novo_n);
        let i_final = "";
        
        if (Number.isInteger(novo_a) && novo_a !== 0) {
            let novo_a_str = novo_a;
            if (novo_a_str === 1 && novo_n !== 0) novo_a_str = "";
            if (novo_a_str === -1 && novo_n !== 0) novo_a_str = "-";
            if (novo_n === 1) { i_final = `${novo_a_str}${variable}`; }
            else if (novo_n === 0) { i_final = `${novo_a_str}`; }
            else { i_final = `${novo_a_str}${variable}^${novo_n}`; }
        } else {
            let num_str = (a_val === 1) ? "" : ( (a_val === -1) ? "-" : a_val );
            if (num_str === 0) { i_final = "0"; }
            
            else if (num_str === "") { // Se a=1, mantenha x no numerador
                if (novo_n === 1) { i_final = `\\frac{${variable}}{${novo_n}}`; }
                else if (novo_n === 0) { i_final = `\\frac{1}{${novo_n}}`; }
                else { i_final = `\\frac{${variable}^${novo_n}}{${novo_n}}`; }
            } else { // Se a != 1, coloque a fração na frente
                if (novo_n === 1) { i_final = `\\frac{${num_str}}{${novo_n}}${variable}`; }
                else if (novo_n === 0) { i_final = `\\frac{${num_str}}{${novo_n}}`; } 
                else { i_final = `\\frac{${num_str}}{${novo_n}}${variable}^${novo_n}`; }
            }
        }
        if(n_val === 0) { i_final = `${a_val}${variable}`; }
        if(a_val === 0) { i_final = "0"; }

        addStep("Regra da Potência (Int.)", "Aplicando a regra da potência.", `\\int a${v}^n d${v} = a \\frac{${v}^{n+1}}{n+1}`, `\\int ${expr} d${v} = ${i_final}`);
        return { integralStr: i_final };
    }
    
    // Caso 3: Regra do Logaritmo (a/x) - Forma alternativa
    const logRegex = new RegExp(`^(-?[\\d\\.]*)\\/${v}$`);
    match = expr.match(logRegex);
    if (match) {
         let a = match[1]; if (a === "") a = "1"; if (a === "-") a = "-1";
         const i_final = `${a === '1' ? '' : (a === '-1' ? '-' : a)} \\cdot \\ln|${variable}|`;
         addStep("Regra do Logaritmo (Int.)", "A integral de a/v é a*ln|v|.", `\\int \\frac{a}{${v}} d${v} = a \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
         return { integralStr: i_final };
    }
    
    // Caso 4: Regra da Potência (variável 'u' - ex: u^5)
    const potURegex = new RegExp(`^${v}(\\^([\\d\\.-]+))?$`);
    match = expr.match(potURegex);
     if (match) {
         let n = match[2]; if (n === undefined) n = "1";
         const n_val = parseFloat(n);
         if(n_val === -1) {
             const i_final = `\\ln|${variable}|`;
             addStep("Regra do Logaritmo (Int.)", "A integral de 1/v é ln|v|.", `\\int \\frac{1}{${v}} d${v} = \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
             return { integralStr: i_final };
         }
         const novo_n = n_val + 1;
         const i_final = `\\frac{${variable}^${novo_n}}{${novo_n}}`;
         addStep( "Regra da Potência (Int.)", "Aplicando a regra da potência para u.", `\\int ${v}^n d${v} = \\frac{${v}^{n+1}}{n+1}`, `\\int ${expr} d${v} = ${i_final}`);
         return { integralStr: i_final };
     }

    // Caso 5: Funções Imediatas (sin(u), cos(u), exp(u))
    const funcRegex = new RegExp(`^(sin|cos|exp)\\(${v}\\)$`); 
    match = expr.match(funcRegex);
    if (match) {
        const func = match[1]; let i_final = ""; let formula = "";
        switch (func) {
            case 'sin': i_final = `-\\cos(${variable})`; formula = `\\int \\sin(${v}) d${v} = -\\cos(${v})`; break;
            case 'cos': i_final = `\\sin(${variable})`; formula = `\\int \\cos(${v}) d${v} = \\sin(${v})`; break;
            case 'exp': i_final = `exp(${variable})`; formula = `\\int e^${v} d${v} = e^${v}`; break;
        }
        addStep(`Integral Imediata de ${func}(${v})`, "Esta é uma integral conhecida.", formula, `\\int ${expr} d${v} = ${i_final}`);
        return { integralStr: i_final };
    }
    
    // Caso 6: Erro
    addStep("Erro (Int.)", `Termo simples não reconhecido: ${expr}`, "", "");
    return { integralStr: `[Erro em ${expr}]` };
}

function getParts(s) {
    s = s.replace(/\s+/g, '').replace(/[()]/g, '');
    if (s === "") return { k: 1, v: "" };
    if (!isNaN(parseFloat(s)) && isFinite(s)) return { k: parseFloat(s), v: "" };
    
    const partRegex = /^(-?[\d\.]+)?\*?([a-z].*)$/i;
    const match = s.match(partRegex);
    
    if (match) {
        let k_str = match[1]; let v_str = match[2]; let k = 1;
        if (k_str === "-") k = -1;
        else if (k_str !== "" && k_str !== undefined) k = parseFloat(k_str);
        return { k: k, v: v_str };
    }
    if (s.match(/^[a-z]/i)) {
         return { k: 1, v: s };
    }
    return { k: 1, v: s };
}

function analisarTermo(termo) {
    let match;
    let analiseBase = null;

    // --- Detecção da Função Composta ---
    const funcRegex = /(sin|cos|tan|ln|exp|sqrt)\(([^)]+)\)/i; 
    const potRegex = /\(([^)]+)\)\^([\d\.]+)$/i;
    const expRegex = /(e|exp)\^?\(([^)]+)\)/i;
    
    let funcCompleta = "";
    let funcMatch = termo.match(funcRegex);
    let potMatch = termo.match(potRegex);
    let expMatch = termo.match(expRegex);

    // Prioriza a detecção
    if (expMatch) {
        const funcInterna = expMatch[2]; if(funcInterna !== 'x') {
            analiseBase = { u: funcInterna, f_u: `e^u`, f_u_raw: `exp(u)` };
            funcCompleta = expMatch[0];
        }
    } else if (funcMatch) {
         const funcExterna = funcMatch[1]; const funcInterna = funcMatch[2];
         if (funcInterna !== 'x') {
            analiseBase = { u: funcInterna, f_u: `${toKaTeX(funcExterna)}(u)`, f_u_raw: `${funcExterna}(u)` };
            funcCompleta = funcMatch[0];
         }
    } else if (potMatch) {
         const funcInterna = potMatch[1]; const expoente = potMatch[2];
         if(funcInterna !== 'x') {
            analiseBase = { u: funcInterna, f_u: `u^${expoente}`, f_u_raw: `u^${expoente}` };
            funcCompleta = potMatch[0];
         }
    }
    
    if (!analiseBase) {
        return { tipo: 'simples', original: termo };
    }

    let otherPart = termo.replace(funcCompleta, "")
                         .replace("()", "") 
                         .replace(/\*$/, "") 
                         .replace(/^\*/, ""); 
                         
    if (otherPart === "") otherPart = "1";
    
    const { derivadaStr, stepsBuilder } = derivar(analiseBase.u, 'leibniz');

    return {
        tipo: 'composto',
        original: termo,
        u: analiseBase.u,
        f_u: analiseBase.f_u,
        f_u_raw: analiseBase.f_u_raw,
        otherPart: otherPart,
        du_str: derivadaStr, 
        du_steps: stepsBuilder
    };
}

function analisarEIntegrarTermo(termo, parentSteps) {
    const analise = analisarTermo(termo);
    
    if (analise.tipo === 'simples') {
        const { integralStr } = integrarTermoSimples(termo, 'x', parentSteps);
        return { integralStr };
    }
    
    parentSteps.addStep(
        "Análise de Substituição (u-sub)",
        "Tentando aplicar a Regra da Substituição.",
        `f(g(x)) = ${toKaTeX(analise.original)}`,
        `Função Externa: $f(u) = ${analise.f_u}$ \\\\ Função Interna: $u = ${toKaTeX(analise.u)}$ \\\\ Parte Restante: $${toKaTeX(analise.otherPart) || '1'}$`
    );
    
    parentSteps.addNestedSteps(`Cálculo da Derivada Interna ($du/dx$):`, analise.du_steps);
    
    const du_parts = getParts(analise.du_str);
    const other_parts = getParts(analise.otherPart);
    let matchType = 'Inválida';
    let k_str = ""; 
    let k = 1;
    let formulaFinal = "";
    let u_integral_steps = null; 

    if (du_parts.v === other_parts.v) { 
        if (other_parts.k === 0) {
             if(du_parts.k === 0) { matchType = 'Perfeita'; k = 1; } 
             else { matchType = 'Inválida'; }
        } else {
            k = du_parts.k / other_parts.k;
            if (Math.abs(k - 1) < 1e-9) { 
                matchType = 'Perfeita';
                k = 1; 
                formulaFinal = `\\int ${analise.f_u} du`;
            } else {
                matchType = 'Constante';
                let k_val = 1/k;
                if (Math.abs(k_val + 1) < 1e-9) { k_str = "-"; } 
                else if (Math.abs(k_val - 1) > 1e-9) { 
                    k_str = (k_val === 0.5) ? "\\frac{1}{2}" : ( (k_val === 0.25) ? "\\frac{1}{4}" : `${parseFloat(k_val.toPrecision(4))}` );
                    if(k_val < 0) k_str = `(${k_str})`;
                }
                formulaFinal = `\\int ${k_str} ${analise.f_u} du`;
            }
        }
    }
    
    if (matchType === 'Perfeita' || matchType === 'Constante') {
        u_integral_steps = new StepsBuilder();
        const { integralStr: u_integral_result } = integrarTermoSimples(analise.f_u_raw, 'u', u_integral_steps);
        
        let k_final_str = ""; 
        let k_step_str = "";  
        
        if (matchType === 'Constante') {
            let k_val = (1/k);
            if (Math.abs(k_val + 1) < 1e-9) { // -1
                k_final_str = "-";
                k_step_str = "-";
            } else if (Math.abs(k_val - 1) > 1e-9) { // Não é 1
                k_step_str = k_str; 
                k_final_str = k_str + " \\cdot ";
            }
        }

        const final_result_str = `${k_final_str}(${u_integral_result.replace(/u/g, `(${analise.u})`)})`;

        parentSteps.addNestedSteps(
            `Passos da Integração em $u$: $${formulaFinal}$`,
            u_integral_steps
        );

        parentSteps.addStep(
            "Re-substituição",
            "Substituindo $u$ de volta para a expressão original.",
            `u = ${toKaTeX(analise.u)}`,
            `${k_step_str.length > 0 ? k_step_str + " \\cdot " : ""}(${u_integral_result}) \\Rightarrow ${final_result_str}`
        );
        
        return { integralStr: final_result_str };

    } else { 
         parentSteps.addStep(
            "Substituição Inválida",
            `$du/dx$ ($${analise.du_str}$) não corresponde à "parte restante" ($${toKaTeX(analise.otherPart)}$).`,
            "",
            "Não é possível aplicar a Regra da Substituição."
         );
         return { integralStr: `[Erro: ${termo}]` }; 
    }
}
