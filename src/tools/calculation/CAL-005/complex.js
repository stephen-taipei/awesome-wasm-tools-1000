class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }

    sub(other) {
        return new Complex(this.re - other.re, this.im - other.im);
    }

    mul(other) {
        // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
        return new Complex(
            this.re * other.re - this.im * other.im,
            this.re * other.im + this.im * other.re
        );
    }

    div(other) {
        // (a+bi)/(c+di) = (a+bi)(c-di)/(c^2+d^2)
        const denom = other.re * other.re + other.im * other.im;
        if (denom === 0) throw new Error("Division by zero");
        return new Complex(
            (this.re * other.re + this.im * other.im) / denom,
            (this.im * other.re - this.re * other.im) / denom
        );
    }

    toString() {
        const imAbs = Math.abs(this.im);
        const sign = this.im >= 0 ? "+" : "-";
        return `${this.re} ${sign} ${imAbs}i`;
    }

    toPolar() {
        const r = Math.sqrt(this.re * this.re + this.im * this.im);
        const theta = Math.atan2(this.im, this.re);
        const deg = theta * 180 / Math.PI;
        return `r = ${r.toFixed(4)}, θ = ${deg.toFixed(2)}°`;
    }
}

function calculate() {
    const r1 = parseFloat(document.getElementById('r1').value) || 0;
    const i1 = parseFloat(document.getElementById('i1').value) || 0;
    const r2 = parseFloat(document.getElementById('r2').value) || 0;
    const i2 = parseFloat(document.getElementById('i2').value) || 0;
    const op = document.getElementById('op').value;

    const c1 = new Complex(r1, i1);
    const c2 = new Complex(r2, i2);

    try {
        let res;
        switch(op) {
            case '+': res = c1.add(c2); break;
            case '-': res = c1.sub(c2); break;
            case '*': res = c1.mul(c2); break;
            case '/': res = c1.div(c2); break;
        }

        document.getElementById('rect-result').textContent = res.toString();
        document.getElementById('polar-result').textContent = res.toPolar();
    } catch (e) {
        document.getElementById('rect-result').textContent = "Error: " + e.message;
        document.getElementById('polar-result').textContent = "";
    }
}
window.calculate = calculate;
