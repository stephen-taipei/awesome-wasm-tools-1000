class Fraction {
    constructor(numerator, denominator = 1) {
        if (denominator === 0) throw new Error("Division by zero");
        this.n = BigInt(numerator);
        this.d = BigInt(denominator);
        if (this.d < 0n) {
            this.n = -this.n;
            this.d = -this.d;
        }
        this.simplify();
    }

    simplify() {
        const gcd = (a, b) => b === 0n ? a : gcd(b, a % b);
        const common = gcd(this.n < 0n ? -this.n : this.n, this.d);
        this.n /= common;
        this.d /= common;
    }

    add(other) {
        return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
    }

    sub(other) {
        return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
    }

    mul(other) {
        return new Fraction(this.n * other.n, this.d * other.d);
    }

    div(other) {
        return new Fraction(this.n * other.d, this.d * other.n);
    }

    toString() {
        if (this.d === 1n) return this.n.toString();
        return `${this.n}/${this.d}`;
    }

    toMixed() {
        if (this.d === 1n) return this.n.toString();
        const whole = this.n / this.d;
        const rem = this.n % this.d;
        if (whole === 0n) return `${rem}/${this.d}`;
        if (rem === 0n) return whole.toString();
        // Handle signs: if whole is negative, rem should be positive for display typically?
        // Actually mixed number -1 1/2 means -1.5.
        // Logic: |n| / d
        const absN = this.n < 0n ? -this.n : this.n;
        const w = absN / this.d;
        const r = absN % this.d;
        const sign = this.n < 0n ? "-" : "";
        if (r === 0n) return `${sign}${w}`;
        if (w === 0n) return `${sign}${r}/${this.d}`;
        return `${sign}${w} ${r}/${this.d}`;
    }
}

function getFraction(wId, nId, dId) {
    const w = document.getElementById(wId).value;
    const n = document.getElementById(nId).value;
    const d = document.getElementById(dId).value;

    let num = 0n;
    let den = 1n;

    if (w) num += BigInt(w);
    if (n && d) {
        const bigN = BigInt(n);
        const bigD = BigInt(d);
        if (num < 0n) {
            // Mixed number logic is tricky. -1 1/2 usually means -(1 + 1/2) = -1.5 = -3/2.
            // But if user types -1 and 1/2, they might mean -1 + 0.5 = -0.5.
            // Standard convention: -A b/c = -(A + b/c).
            num = -((-num * bigD) + bigN);
        } else {
            num = (num * bigD) + bigN;
        }
        den = bigD;
    } else if (w) {
        // just whole number
        den = 1n;
    } else if (n && d) {
        num = BigInt(n);
        den = BigInt(d);
    } else {
        return new Fraction(0);
    }

    return new Fraction(num, den);
}

function calculate() {
    try {
        const f1 = getFraction('w1', 'n1', 'd1');
        const f2 = getFraction('w2', 'n2', 'd2');
        const op = document.getElementById('op').value;

        let res;
        switch(op) {
            case '+': res = f1.add(f2); break;
            case '-': res = f1.sub(f2); break;
            case '*': res = f1.mul(f2); break;
            case '/': res = f1.div(f2); break;
        }

        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = `
            <div>Improper: ${res.toString()}</div>
            <div>Mixed: ${res.toMixed()}</div>
            <div>Decimal: ${(Number(res.n) / Number(res.d)).toFixed(5)}...</div>
        `;
    } catch (e) {
        document.getElementById('result').textContent = "Error: " + e.message;
    }
}
window.calculate = calculate;
