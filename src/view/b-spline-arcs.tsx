import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";

import { evaluateBezierArc } from "../spline/b3";

import { LayerProps } from "./shared";

@observer
export class BSplineArcs extends React.Component<LayerProps> {
	render() {
		const model = this.props.model;
		let groups: JSX.Element[] = [];
		for (let c = 0; c < model.points.length; c++) {
			const arcs: JSX.Element[] = [];
			for (let j = 0; j < model.points[c].length; j++) {
				arcs.push(<BSplineArc model={model} contour={c} index={j} key={j} />);
			}
			groups.push(<g key={c}>{arcs}</g>);
		}
		return groups;
	}
}

interface BSplineArcProps extends LayerProps {
	readonly contour: number;
	readonly index: number;
}

@observer
class BSplineArc extends React.Component<BSplineArcProps> {
	private get selected() {
		const { model, contour, index } = this.props;
		if (!model.selection || model.selection.type !== "Arc") return false;
		return model.selection.contourID === contour && model.selection.knotID === index;
	}

	@action.bound
	private selectArc<E>(e: React.MouseEvent<E>) {
		e.stopPropagation();
		e.preventDefault();
		const { model, contour, index } = this.props;
		model.selection = { type: "Arc", contourID: contour, knotID: index };
	}

	render() {
		const { model, contour, index } = this.props;
		const arc = evaluateBezierArc(model.points[contour], index);
		let d: string;
		if (arc.b && arc.c) {
			d =
				`M ${arc.a.point.x},${arc.a.point.y} ` +
				`C ${arc.b.point.x},${arc.b.point.y}` +
				` ${arc.c.point.x},${arc.c.point.y}` +
				` ${arc.d.point.x},${arc.d.point.y}`;
		} else {
			d = `M ${arc.a.point.x},${arc.a.point.y} ` + `L ${arc.d.point.x},${arc.d.point.y}`;
		}
		const sk = this.selected ? "selected" : "";
		return (
			<>
				<path className={"outline-arc " + sk} d={d} onClick={this.selectArc} />
				<path className={"interact-arc " + sk} d={d} onClick={this.selectArc} />
			</>
		);
	}
}
