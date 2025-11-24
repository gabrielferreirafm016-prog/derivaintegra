/**
 * Derivaintegra - Biblioteca de Cálculo Simbólico (Derivada e Integral)
 * Versão: ES Module (Moderno)
 */

class StepsBuilder {
    constructor() {
        this.steps = [];
        this.isIntegral = false; 
    }
    
    addStep(title, explanation, formula, calculo, isError = false) { 
        this.steps.push({ title, explanation, formula, calculo, isError }); 
    }
    
    addNestedSteps(title, nestedBuilder) { 
        this.steps.push({ title, nestedBuilder }); 
    }
    
    render() {
        if (this.steps.length === 0) return "Nenhum passo gerado.";
        return this.steps.map((step, index) => {
            let html = `<div class="step">`;
            html += `<div class="step-title">${index + 1}. ${step.title}</div>`;
            if (step.nestedBuilder) {
                html += `<div style="padding-left: 20px; border-left: 2px solid #ccc; margin-top: 10px;">`;
                html += step.nestedBuilder.render();
                html += `</div>`;
            } else {
                html += `<ul>`;
                if (step.explanation) html += `<li>${step.explanation}</li>`;
                if (step.formula) html += `<li><strong>Fórmula:</strong> $${step.formula}$</li>`;
                if (step.calculo) html += `<li><strong>Cálculo:</strong> $${step.calculo}$</li>`;
                html += `</ul>`;
            }
            html += `</div>`;
            return html;
        }).join('');
    }
}

// --- FUNÇÕES UTILITÁRIAS ---

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

function toKaTeX(str) { 
    if (!str) return "";
    let katexStr = str.replace(/\s+/g, ' '); 
    katexStr = katexStr.replace(/\b(sin|cos|tan|ln|sqrt)\(/g, "\\$1(");
    katexStr = katexStr.replace(/exp\(([^)]+)\)/g, (match, content) => {
        if (content.match(/^-?([\d\.]*x(\^[\d\.-]+)?|[\d\.]+)$/)) {
            return `e^{${content}}`;
        }
        return `e^{(${content})}`;
    });
    katexStr = katexStr.replace(/e\^\(([^)]+)\)/g, "e^{$1}");
    katexStr = katexStr.replace(/(\d)\s*\*\s*(\d)/g, '$1 \\cdot $2');
    katexStr = katexStr.replace(/\s*\*\s*/g, " "); 
    return katexStr;
}

function simplifyExpression(expr) {
    let simplified = expr;
    let lastExpr;
    do {
        lastExpr = simplified;
        simplified = simplified.replace(/\(\(([^()]+)\)\)/g, '($1)');
        simplified = simplified.replace(/(?<!\\?(?:sin|cos|tan|sqrt|ln|exp))\(([^()]+)\)/g, (match, content) => { if (content.match(/^-?([\d\.]*x(\^[\d\.-]+)?|[\d\.]+)$/)) { return content; } return match; });
        simplified = simplified.replace(/([^*\/+\-\s])\s*\*\s*\((-[^()]+)\)/g, '- $1 * $2');
        simplified = simplified.replace(/\((-[^()]+)\)\s*\*\s*([^*\/+\-\s])/g, '- $1 * $2');
        simplified = simplified.replace(/\+\s*-\s*/g, '- ');
        simplified = simplified.replace(/-\s*-\s*/g, '+ ');
        simplified = simplified.replace(/([^\s()]*|\([^)]+\))\s*\*\s*0/g, '0');
        simplified = simplified.replace(/0\s*\*\s*([^\s()]*|\([^)]+\))/g, '0');
        simplified = simplified.replace(/\+\s*0/g, '');
        simplified = simplified.replace(/0\s*\+/g, '');
        simplified = simplified.replace(/-\s*\((.+?)\s*\+\s*(.+?)\)/g, '- $1 - $2');
        simplified = simplified.replace(/-\s*\((.+?)\s*-\s*(.+?)\)/g, '- $1 + $2');
        simplified = simplified.replace(/-\s*\(([^\(\)]+)\)/g, (match, content) => { if (content.match(/^(\\?(sin|cos|tan|sqrt)|ln|exp)\(.*\)$/)) { return `- ${content}`; } if (!content.includes('+') && !content.includes('-') && !content.includes('*') && !content.includes('/')) { return `- ${content}`; } return match; });
        simplified = simplified.replace(/\s+/g, ' ').trim();
    } while (simplified !== lastExpr);
    
    if (simplified.startsWith('(') && simplified.endsWith(')')) {
        let parenCount = 0; let valid = true;
        for (let i = 0; i < simplified.length - 1; i++) { if (simplified[i] === '(') parenCount++; if (simplified[i] === ')') parenCount--; if (parenCount === 0) { valid = false; break; } }
        if (valid) { simplified = simplified.substring(1, simplified.length - 1); }
    }
    return simplified;
}

function splitTopLevel(str) {
    let parts = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        if (char === '(') depth++;
        if (char === ')') depth--;
        if (depth === 0 && (char === '+' || char === '-')) {
            if (current.trim()) parts.push(current.trim());
            parts.push(char); 
            current = "";
        } else {
            current += char;
        }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
}

function distribuirProduto(coef, expr) {
    let inner = expr.trim();
    if (inner.startsWith('(') && inner.endsWith(')')) {
        let depth = 0, ok = true;
        for(let i=0; i<inner.length-1; i++) {
            if(inner[i]=='(') depth++; if(inner[i]==')') depth--;
            if(depth==0) { ok=false; break; }
        }
        if(ok) inner = inner.substring(1, inner.length-1);
    }
    let parts = splitTopLevel(inner);
    let result = "";
    if (parts.length === 1) { return `${coef} * ${parts[0]}`; }
    for (let i = 0; i < parts.length; i++) {
        let p = parts[i];
        if (p === '+' || p === '-') { result += ` ${p} `; } else { result += `${coef} * ${p}`; }
    }
    return result;
}

function extrairCoeficiente(termo) {
    let t = termo.replace(/\s+/g, '');
    if (t.startsWith('(') && t.endsWith(')')) t = t.substring(1, t.length-1);
    let coef = 1; let resto = t;
    const matchNum = t.match(/^(-?[\d\.]+)(\*)?/);
    if (matchNum) {
        coef = parseFloat(matchNum[1]);
        resto = t.substring(matchNum[0].length);
        if (resto === '') resto = '1';
    } else if (t.startsWith('-')) {
        coef = -1; resto = t.substring(1);
    }
    return { coef, resto };
}

// --- MOTOR DE DERIVAÇÃO ---

function derivar(expr, notation) {
    const stepsBuilder = new StepsBuilder();
    let d_final = "";
    let expr_str_limpa = expr.replace(/\s+/g, '');
    if (!expr_str_limpa) return { derivadaStr: "0", stepsBuilder };
    const result = derivarExpressao(expr_str_limpa, stepsBuilder, notation);
    stepsBuilder.addStep("União dos Resultados", "Juntando todos os resultados parciais...", `f'(x) = ${result.derivadaStr}`, null);
    d_final = simplifyExpression(result.derivadaStr);
    return { derivadaStr: d_final, stepsBuilder: stepsBuilder };
}

function derivarExpressao(expr, parentSteps, notation) {
    let d_final = "";
    let termos = []; let operadores = []; let parenCount = 0; let start = 0;
    for (let i = 0; i < expr.length; i++) {
        const char = expr[i]; if (char === '(') parenCount++; if (char === ')') parenCount--;
        if (parenCount === 0 && (char === '+' || char === '-')) {
            if (i > 0 || (char === '+' && start === 0)) { 
                if (i > 0) { termos.push(expr.substring(start, i)); operadores.push(char); }
                start = i + 1; 
            }
        }
    }
    termos.push(expr.substring(start));
    if (termos.length === 1 && operadores.length === 0) return derivarTermo(expr, parentSteps, notation);
    
    let formula, calculo;
    if (notation === 'leibniz') { formula = `\\frac{d}{dx}(u \u00B1 v) = \\frac{d}{dx}(u) \u00B1 \\frac{d}{dx}(v)`; calculo = `\\text{Aplicando a } \\frac{d}{dx}(${toKaTeX(expr)})`; }
    else { formula = `(u \u00B1 v)' = u' \u00B1 v'`; calculo = `\\text{Aplicando a } (${toKaTeX(expr)})'`; }
    parentSteps.addStep( "Regra da Soma/Subtração", "A derivada de uma soma/subtração é a soma/subtração das derivadas.", formula, calculo);
    
    let derivadasTermos = [];
    for (let i = 0; i < termos.length; i++) {
        const termo = termos[i]; if(termo === "") continue;
        const nestedSteps = new StepsBuilder(); nestedSteps.isIntegral = parentSteps.isIntegral;
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
    match = expr.match(/^(.+)\^([\d\.-]+)$/);
    if (match) {
        const u = match[1];
        const n = parseFloat(match[2]);
        let parenCount = 0;
        let unbalanced = false;
        for(let char of u) {
            if(char === '(') parenCount++;
            if(char === ')') parenCount--;
            if(parenCount < 0) { unbalanced = true; break; }
        }
        if(!unbalanced && parenCount === 0) {
            const nestedSteps = new StepsBuilder();
            const uResult = derivarFator(u, nestedSteps, notation);
            if (!uResult.derivadaStr.startsWith('[Erro')) {
                const novo_n = n - 1;
                let u_pow_str = "";
                const u_latex = toKaTeX(u);
                const du_latex = toKaTeX(uResult.derivadaStr);
                if (novo_n === 1) u_pow_str = wrapIfNeeded(u);
                else if (novo_n === 0) u_pow_str = "1";
                else u_pow_str = `(${u})^${novo_n}`;
                let d_final = `${n} * ${u_pow_str} * (${uResult.derivadaStr})`;
                parentSteps.addStep(
                    "Regra da Cadeia (Potência)", 
                    "Aplicando $(u^n)' = n \\cdot u^{n-1} \\cdot u'$", 
                    `u = ${u_latex}, \\quad n = ${n}`, 
                    `f' = ${n} \\cdot (${u_latex})^{${novo_n}} \\cdot (${du_latex})`
                );
                parentSteps.addNestedSteps(`Derivada da base $u$:`, uResult.stepsBuilder);
                return { derivadaStr: d_final, stepsBuilder: parentSteps };
            }
        }
    }

    match = expr.match(/^(sin|cos|tan|ln|exp|sqrt)\((.+)\)$/);
    if (match) {
        const func = match[1]; const innerExpr = match[2];
        let parenCount = 0;
        for(let char of innerExpr) { if (char === '(') parenCount++; if (char === ')') parenCount--; }
        if (parenCount !== 0) {
            parentSteps.addStep("Erro", `Parênteses desbalanceados em: ${expr}`, "", "", true);
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
    parentSteps.addStep("Erro", `Termo não reconhecido: ${expr}`, "", "", true);
    return { derivadaStr: `[Erro: ${expr}]`, stepsBuilder: parentSteps };
}

// --- MOTOR DE INTEGRAÇÃO ---

function integrar(expr) {
    let exprLimpa = expr.replace(/\s+/g, '');
    let termos = []; let operadores = ['+']; let parenCount = 0; let start = 0;
    for (let i = 0; i < exprLimpa.length; i++) {
        const char = exprLimpa[i]; if (char === '(') parenCount++; if (char === ')') parenCount--;
        if (parenCount === 0 && (char === '+' || char === '-')) {
            if (i > 0) { termos.push(exprLimpa.substring(start, i)); operadores.push(char); start = i + 1; } else if (char === '-' && i === 0) { start = 1; operadores[0] = '-'; }
        }
    }
    termos.push(exprLimpa.substring(start));
    const mainStepsBuilder = new StepsBuilder();
    mainStepsBuilder.isIntegral = true;
    let finalIntegralTerms = []; 
    mainStepsBuilder.addStep( 
        "Regra da Soma (Integração)", 
        "A integral da soma é a soma das integrais de cada termo.", 
        "\\int (f(x) + g(x)) dx = \\int f(x) dx + \\int g(x) dx", 
        `\\text{Separando a expressão: } \\int ${toKaTeX(expr)} dx` 
    );
    for (let i = 0; i< termos.length; i++) {
        let termo = termos[i]; if (!termo) continue;
        let sinal = operadores[i]; let termoOriginal = (sinal === '+' ? (i>0 ? ' + ' : '') : ' - ') + termo;
        if(sinal === '-') termo = '-' + termo;
        let sinalOperador = (sinal === '-' ? ' - ' : ' + '); if (i === 0 && sinal === '+') sinalOperador = '';
        const nestedSteps = new StepsBuilder(); nestedSteps.isIntegral = true;
        const { integralStr: termoResultStr } = analisarEIntegrarTermo(termo, nestedSteps);
        finalIntegralTerms.push(sinalOperador + termoResultStr); 
        mainStepsBuilder.addNestedSteps( `Integrando o termo: $${toKaTeX(termoOriginal)} dx$`, nestedSteps );
    }
    let rawIntegralStr = finalIntegralTerms.join('').trim(); 
    if (rawIntegralStr.startsWith(' + ')) rawIntegralStr = rawIntegralStr.substring(3);
    let finalIntegralStr_raw = simplifyExpression(rawIntegralStr); 
    return { integralStr: finalIntegralStr_raw, stepsBuilder: mainStepsBuilder };
}

function integrarTermoSimples(expr, variable = 'x', parentSteps = null) {
    const addStep = (title, exp, f, c, isErr=false) => { if (parentSteps) { parentSteps.isIntegral = true; parentSteps.addStep(title, exp, f, c, isErr); } };
    const v = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!isNaN(parseFloat(expr)) && isFinite(expr) && !expr.toLowerCase().includes(variable)) {
        const c = expr; const i_final = (c === '0') ? '0' : `${c}${variable}`;
        if(c === '0') { addStep("Integral de Zero", "A integral de 0 é 0.", `\\int 0 d${v} = 0`, ``); return { integralStr: '0' }; }
        addStep("Regra da Constante (Int.)", "A integral de uma constante 'c' é 'cv'.", `\\int c d${v} = c${v}`, `\\int ${c} d${v} = ${i_final}`);
        return { integralStr: i_final };
    }
    const potRegex = new RegExp(`^(-?[\\d\\.]*)${v}(\\^([\\d\\.-]+))?$`);
    let match = expr.match(potRegex);
    if (match) {
        let a = match[1]; let n = match[3]; if (a === "") a = "1"; if (a === "-") a = "-1"; if (n === undefined) n = "1";
        const a_val = parseFloat(a); const n_val = parseFloat(n);
        if (n_val === -1) {
            const i_final = `${a_val === 1 ? '' : (a_val === -1 ? '-' : a_val)} \\cdot \\ln|${variable}|`;
            addStep("Regra do Logaritmo (Int.)", "A integral de a/v é a*ln|v|.", `\\int \\frac{a}{${v}} d${v} = a \\cdot \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
            return { integralStr: i_final };
        }
        const novo_n = n_val + 1; const novo_a = (a_val / novo_n); let i_final = "";
        if (Number.isInteger(novo_a) && novo_a !== 0) {
            let novo_a_str = novo_a; if (novo_a_str === 1 && novo_n !== 0) novo_a_str = ""; if (novo_a_str === -1 && novo_n !== 0) novo_a_str = "-";
            if (novo_n === 1) { i_final = `${novo_a_str}${variable}`; } else if (novo_n === 0) { i_final = `${novo_a_str}`; } else { i_final = `${novo_a_str}${variable}^${novo_n}`; }
        } else {
            let num_str = (a_val === 1) ? "" : ( (a_val === -1) ? "-" : a_val );
            if (num_str === 0) { i_final = "0"; }
            else if (num_str === "") { 
                if (novo_n === 1) { i_final = `\\frac{${variable}}{${novo_n}}`; } else if (novo_n === 0) { i_final = `\\frac{1}{${novo_n}}`; } else { i_final = `\\frac{${variable}^${novo_n}}{${novo_n}}`; }
            } else { 
                if (novo_n === 1) { i_final = `\\frac{${num_str}}{${novo_n}}${variable}`; } else if (novo_n === 0) { i_final = `\\frac{${num_str}}{${novo_n}}`; } else { i_final = `\\frac{${num_str}}{${novo_n}}${variable}^${novo_n}`; }
            }
        }
        if(n_val === 0) { i_final = `${a_val}${variable}`; } if(a_val === 0) { i_final = "0"; }
        addStep("Regra da Potência (Int.)", "Aplicando a regra da potência.", `\\int a${v}^n d${v} = a \\frac{${v}^{n+1}}{n+1}`, `\\int ${expr} d${v} = ${i_final}`);
        return { integralStr: i_final };
    }
    const logRegex = new RegExp(`^(-?[\\d\\.]*)\\/${v}$`);
    match = expr.match(logRegex);
    if (match) {
            let a = match[1]; if (a === "") a = "1"; if (a === "-") a = "-1";
            const i_final = `${a === '1' ? '' : (a === '-1' ? '-' : a)} \\cdot \\ln|${variable}|`;
            addStep("Regra do Logaritmo (Int.)", "A integral de a/v é a*ln|v|.", `\\int \\frac{a}{${v}} d${v} = a \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
            return { integralStr: i_final };
    }
    const potURegex = new RegExp(`^${v}(\\^([\\d\\.-]+))?$`);
    match = expr.match(potURegex);
        if (match) {
            let n = match[2]; if (n === undefined) n = "1"; const n_val = parseFloat(n);
            if(n_val === -1) {
                const i_final = `\\ln|${variable}|`;
                addStep("Regra do Logaritmo (Int.)", "A integral de 1/v é ln|v|.", `\\int \\frac{1}{${v}} d${v} = \\ln|${v}|`, `\\int ${expr} d${v} = ${i_final}`);
                return { integralStr: i_final };
            }
            const novo_n = n_val + 1; const i_final = `\\frac{${variable}^${novo_n}}{${novo_n}}`;
            addStep( "Regra da Potência (Int.)", "Aplicando a regra da potência para u.", `\\int ${v}^n d${v} = \\frac{${v}^{n+1}}{n+1}`, `\\int ${expr} d${v} = ${i_final}`);
            return { integralStr: i_final };
        }
    const funcRegex = new RegExp(`^\\\\?(sin|cos|exp)\\(${v}\\)$`); 
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
    
    if (expr.includes('*') || expr.includes('/')) {
        const partsResult = tentarIntegrarPorPartes(expr, parentSteps);
        if (partsResult) return partsResult;

        addStep("Recurso Não Suportado", `O termo $${toKaTeX(expr)}$ parece requerer <strong>Integração por Partes</strong> complexa ou simplificação algébrica.`, "", "Esta versão suporta apenas integrais imediatas, substituição e integração por partes simples (polinômio x trig/exp).", true);
        return { integralStr: `\\text{[Complexo: } ${toKaTeX(expr)} \\text{]}` };
    }

    addStep("Erro (Int.)", `Termo simples não reconhecido: ${expr}`, "", "", true);
    return { integralStr: `[Erro em ${expr}]` };
}

function tentarIntegrarPorPartes(expr, parentSteps) {
    // console.log("Tentando Integração por Partes em:", expr);

    const parts = expr.split('*');
    if (parts.length !== 2) return null;
    
    let u_cand = parts[0].trim();
    let dv_cand_raw = parts[1].trim();
    let u = "", dv_raw = "";

    const isPoly = (s) => /^(-?[\d\.]*)x(\^[\d\.]+)?$/.test(s);
    const isTrigExp = (s) => /^\\?(sin|cos|exp)\(x\)$/.test(s.replace(/\\/g, ''));

    if (isPoly(u_cand) && isTrigExp(dv_cand_raw)) {
        u = u_cand; dv_raw = dv_cand_raw;
    } else if (isPoly(dv_cand_raw) && isTrigExp(u_cand)) {
        u = dv_cand_raw; dv_raw = u_cand;
    } else {
        return null;
    }
    
    parentSteps.addStep(
        "Integração por Partes",
        "Identificamos um produto de polinômio por função transcendente.",
        "\\int u \\cdot dv = u \\cdot v - \\int v \\cdot du",
        `\\text{Escolha (LIATE): } u = {${toKaTeX(u)}}, \\quad dv = {${toKaTeX(dv_raw)} dx}`
    );

    const du_res = derivar(u, 'leibniz');
    const du = du_res.derivadaStr;
    
    const v_res = integrarTermoSimples(dv_raw.replace(/\\/g, ''), 'x', null);
    const v = v_res.integralStr;
    
    const v_data = extrairCoeficiente(v);
    const du_data = extrairCoeficiente(du);
    
    const coefTotal = v_data.coef * du_data.coef;
    
    let partsToJoin = [];
    if (v_data.resto !== '1') partsToJoin.push(v_data.resto);
    if (du_data.resto !== '1') partsToJoin.push(du_data.resto);
    
    let novaIntegralCore = partsToJoin.length > 0 ? partsToJoin.join(' * ') : '1';

    let finalIntegralCore = novaIntegralCore;
    if (finalIntegralCore.match(/^(\\?)(sin|cos|exp)\(x\) \* [\d\.]+x/)) {
        let p = finalIntegralCore.split('*');
        finalIntegralCore = `${p[1].trim()} * ${p[0].trim()}`;
    }
    
    let sinalStr = "";
    let coefAbs = Math.abs(coefTotal);
    
    if (coefTotal < 0) {
            sinalStr = " + ";
            if (Math.abs(coefTotal + 1) > 1e-9) sinalStr += `${coefAbs} * `;
    } else {
            sinalStr = " - ";
            if (Math.abs(coefTotal - 1) > 1e-9) sinalStr += `${coefTotal} * `;
    }
    
    parentSteps.addStep(
        "Aplicação da Fórmula",
        "Calculamos $du$ e $v$ e aplicamos a fórmula.",
        `du = {(${toKaTeX(du)}) dx}, \\quad v = {${toKaTeX(v)}}`,
        `\\text{Parcial} = {${toKaTeX(u)}} \\cdot ({${toKaTeX(v)}}) - \\int ({${toKaTeX(v)}}) \\cdot ({${toKaTeX(du)}}) dx`
    );

    const nestedSteps = new StepsBuilder();
    nestedSteps.isIntegral = true;

    let recursaoStr = "";
    if (!finalIntegralCore.includes('*')) {
            const r = integrarTermoSimples(finalIntegralCore, 'x', nestedSteps);
            recursaoStr = r.integralStr;
    } else {
            const r = analisarEIntegrarTermo(finalIntegralCore, nestedSteps);
            recursaoStr = r.integralStr;
    }

    parentSteps.addNestedSteps(`Resolvendo a integral restante: $\\int ${toKaTeX(finalIntegralCore)} dx$`, nestedSteps);
    
    // --- MONTAGEM INTELIGENTE DO RESULTADO ---
    let uv_final = "";
    let u_clean = u.trim();
    let v_clean = v.trim();
    let globalSign = 1;
    
    if (u_clean.startsWith('-')) { globalSign *= -1; u_clean = u_clean.substring(1); }
    if (v_clean.startsWith('-')) { globalSign *= -1; v_clean = v_clean.substring(1); }
    
    if (globalSign === -1) uv_final = `-${u_clean} * ${v_clean}`;
    else uv_final = `${u_clean} * ${v_clean}`;

    // --- DISTRIBUIÇÃO INTELIGENTE DA CONSTANTE ---
    let recursao_final = recursaoStr;
    
    if (sinalStr.includes('*')) {
        let matchSinal = sinalStr.match(/(\d+(?:\.\d+)?)/);
        if (matchSinal) {
            let constVal = parseFloat(matchSinal[1]);
            // Se o sinal era negativo (sinalStr começa com " - "), distribuimos -constVal?
            // Na formula uv - int, o sinalStr já tem o sinal correto da operação.
            if (sinalStr.trim().startsWith("-")) {
                constVal = -constVal;
            }

            let distributed = distribuirProduto(constVal, recursaoStr);
            
            if (distributed !== "" && !distributed.includes("undefined")) {
                recursao_final = distributed;
                sinalStr = ""; 
            } else {
                    if (recursaoStr.includes('+') || recursaoStr.includes('-')) {
                    if (!recursaoStr.startsWith('(')) recursao_final = `(${recursaoStr})`;
                }
            }
        }
    } else {
            if ((sinalStr.trim() === '-' || sinalStr.trim() === '+') && (recursaoStr.includes('+') || recursaoStr.includes('-'))) {
                if (!recursaoStr.startsWith('(')) recursao_final = `(${recursaoStr})`;
            }
    }

    let resultadoFinal = "";
    if (sinalStr === "") {
        if (!recursao_final.trim().startsWith("+") && !recursao_final.trim().startsWith("-")) {
                resultadoFinal = `${uv_final} + ${recursao_final}`;
        } else {
                resultadoFinal = `${uv_final} ${recursao_final}`;
        }
    } else {
        resultadoFinal = `${uv_final} ${sinalStr} ${recursao_final}`;
    }
    
    resultadoFinal = simplifyExpression(resultadoFinal);

    parentSteps.addStep(
        "Conclusão da Integração por Partes",
        "Combinando e simplificando.",
        `\\text{Resultado} = {${toKaTeX(resultadoFinal)}}`
    );

    return { integralStr: resultadoFinal };
}

function getParts(s) {
    s = s.replace(/\s+/g, '').replace(/[()]/g, '');
    if (s === "") return { k: 1, v: "" };
    if (!isNaN(parseFloat(s)) && isFinite(s)) return { k: parseFloat(s), v: "" };
    const partRegex = /^(-?[\d\.]+)?\*?([a-z].*)$/i; const match = s.match(partRegex);
    if (match) {
        let k_str = match[1]; let v_str = match[2]; let k = 1;
        if (k_str === "-") k = -1; else if (k_str !== "" && k_str !== undefined) k = parseFloat(k_str);
        return { k: k, v: v_str };
    }
    if (s.match(/^[a-z]/i)) { return { k: 1, v: s }; }
    return { k: 1, v: s };
}

function analisarTermo(termo) {
    let match; let analiseBase = null;
    const funcRegex = /\\?(sin|cos|tan|ln|exp|sqrt)\(([^)]+)\)/i; 
    const potRegex = /\(([^)]+)\)\^([\d\.]+)$/i; 
    const expRegex = /(e|exp)\^?\(([^)]+)\)/i;
    
    let funcCompleta = ""; let funcMatch = termo.match(funcRegex); let potMatch = termo.match(potRegex); let expMatch = termo.match(expRegex);
    if (expMatch) {
        const funcInterna = expMatch[2]; if(funcInterna !== 'x') { analiseBase = { u: funcInterna, f_u: `e^u`, f_u_raw: `exp(u)` }; funcCompleta = expMatch[0]; }
    } else if (funcMatch) {
            const funcExterna = funcMatch[1]; const funcInterna = funcMatch[2];
            if (funcInterna !== 'x') { analiseBase = { u: funcInterna, f_u: `${toKaTeX(funcExterna)}(u)`, f_u_raw: `${funcExterna}(u)` }; funcCompleta = funcMatch[0]; }
    } else if (potMatch) {
            const funcInterna = potMatch[1]; const expoente = potMatch[2];
            if(funcInterna !== 'x') { analiseBase = { u: funcInterna, f_u: `u^${expoente}`, f_u_raw: `u^${expoente}` }; funcCompleta = potMatch[0]; }
    }
    if (!analiseBase) { return { tipo: 'simples', original: termo }; }
    let otherPart = termo.replace(funcCompleta, "").replace("()", "").replace(/\*$/, "").replace(/^\*/, ""); 
    if (otherPart === "") otherPart = "1";
    const { derivadaStr, stepsBuilder } = derivar(analiseBase.u, 'leibniz');
    return { tipo: 'composto', original: termo, u: analiseBase.u, f_u: analiseBase.f_u, f_u_raw: analiseBase.f_u_raw, otherPart: otherPart, du_str: derivadaStr, du_steps: stepsBuilder };
}

function analisarEIntegrarTermo(termo, parentSteps) {
    const analise = analisarTermo(termo);
    if (analise.tipo === 'simples') { const { integralStr } = integrarTermoSimples(termo, 'x', parentSteps); return { integralStr }; }
    parentSteps.addStep( "Análise de Substituição (u-sub)", "Tentando aplicar a Regra da Substituição.", `f(g(x)) = ${toKaTeX(analise.original)}`, `Função Externa: $f(u) = ${analise.f_u}$ \\\\ Função Interna: $u = ${toKaTeX(analise.u)}$ \\\\ Parte Restante: $${toKaTeX(analise.otherPart) || '1'}$` );
    parentSteps.addNestedSteps(`Cálculo da Derivada Interna ($du/dx$):`, analise.du_steps);
    const du_parts = getParts(analise.du_str); const other_parts = getParts(analise.otherPart);
    let matchType = 'Inválida'; let k_str = ""; let k = 1; let formulaFinal = ""; let u_integral_steps = null; 
    if (du_parts.v === other_parts.v) { 
        if (other_parts.k === 0) { if(du_parts.k === 0) { matchType = 'Perfeita'; k = 1; } else { matchType = 'Inválida'; } } else {
            k = du_parts.k / other_parts.k;
            if (Math.abs(k - 1) < 1e-9) { matchType = 'Perfeita'; k = 1; formulaFinal = `\\int ${analise.f_u} du`; } else {
                matchType = 'Constante'; let k_val = 1/k;
                if (Math.abs(k_val + 1) < 1e-9) { k_str = "-"; } else if (Math.abs(k_val - 1) > 1e-9) { k_str = (k_val === 0.5) ? "\\frac{1}{2}" : ( (k_val === 0.25) ? "\\frac{1}{4}" : `${parseFloat(k_val.toPrecision(4))}` ); if(k_val < 0) k_str = `(${k_str})`; }
                formulaFinal = `\\int ${k_str} ${analise.f_u} du`;
            }
        }
    }
    if (matchType === 'Perfeita' || matchType === 'Constante') {
        u_integral_steps = new StepsBuilder();
        const { integralStr: u_integral_result } = integrarTermoSimples(analise.f_u_raw, 'u', u_integral_steps);
        let k_final_str = ""; let k_step_str = "";  
        if (matchType === 'Constante') {
            let k_val = (1/k);
            if (Math.abs(k_val + 1) < 1e-9) { k_final_str = "-"; k_step_str = "-"; } else if (Math.abs(k_val - 1) > 1e-9) { k_step_str = k_str; k_final_str = k_str + " \\cdot "; }
        }
        const final_result_str = `${k_final_str}(${u_integral_result.replace(/u/g, `(${analise.u})`)})`;
        parentSteps.addNestedSteps( `Passos da Integração em $u$: $${formulaFinal}$`, u_integral_steps );
        parentSteps.addStep( "Re-substituição", "Substituindo $u$ de volta para a expressão original.", `u = ${toKaTeX(analise.u)}`, `${k_step_str.length > 0 ? k_step_str + " \\cdot " : ""}(${u_integral_result}) \\Rightarrow ${final_result_str}` );
        return { integralStr: final_result_str };
    } else { 
            const partsResult = tentarIntegrarPorPartes(termo, parentSteps);
            if (partsResult) return partsResult;

            parentSteps.addStep( "Substituição Inválida", `$du/dx$ ($${analise.du_str}$) não corresponde à "parte restante" ($${toKaTeX(analise.otherPart)}$).`, "", "Não é possível aplicar a Regra da Substituição.", true);
            return { integralStr: `[Erro: ${termo}]` }; 
    }
}

// --- EXPORTAÇÃO ES MODULE ---
export {
    derivar,
    integrar,
    StepsBuilder
};