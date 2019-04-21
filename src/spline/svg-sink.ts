import { XY } from "./b3";
import { BezierActionSink } from "./bezier-action";

type Z = XY<number>;

export class SvgBezierActionSink implements BezierActionSink<Z> {
	private d: string = "";
	moveTo(z: Z) {
		this.d += `M ${z.x} ${z.y} `;
	}
	lineTo(a: Z) {
		this.d += `L ${a.x} ${a.y} `;
	}
	quadTo(a: Z, b: Z) {
		this.d += `Q ${a.x} ${a.y} ${b.x} ${b.y} `;
	}
	curveTo(a: Z, b: Z, c: Z) {
		this.d += `C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y} `;
	}
	getResult() {
		if (this.d) return this.d + "Z";
		else return "";
	}
}

export class SvgArcsSink implements BezierActionSink<Z> {
	private last: Z = { x: 0, y: 0 };
	private ds: string[] = [];
	moveTo(z: Z) {
		this.last = z;
	}
	lineTo(a: Z) {
		this.ds.push(`M ${this.last.x} ${this.last.y} L ${a.x} ${a.y}`);
		this.last = a;
	}

	quadTo(a: Z, b: Z) {
		this.ds.push(`M ${this.last.x} ${this.last.y} ` + `Q ${a.x} ${a.y} ${b.x} ${b.y}`);
		this.last = b;
	}
	curveTo(a: Z, b: Z, c: Z) {
		this.ds.push(
			`M ${this.last.x} ${this.last.y} ` + `C ${a.x} ${a.y} ${b.x} ${b.y} ${c.x} ${c.y}`
		);
		this.last = c;
	}
	getArcs() {
		return this.ds;
	}
}
