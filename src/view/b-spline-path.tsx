import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";

import { term } from "../spline/array-util";
import { evaluatePointT } from "../spline/b3";
import { BSplineModel, OnKnotType } from "../spline/model";

import { LayerProps } from "./shared";

const DICE = 8;
@observer
export class BSplineDice extends React.Component<LayerProps> {
	render() {
		const model = this.props.model;

		let gs: JSX.Element[] = [];
		for (let c = 0; c < model.points.length; c++) {
			const contour = model.points[c];
			let zs: JSX.Element[] = [];
			for (let j = 0; j < contour.length; j++) {
				for (let d = 0; d < DICE; d++) {
					const z = evaluatePointT(contour, j, d / DICE);
					zs.push(<circle cx={z.x} cy={z.y} r={1} key={j + "/" + d} />);
				}
			}
			gs.push(<g key={c}>{zs}</g>);
		}
		return gs;
	}
}

@observer
export class BSplineOnKnots extends React.Component<LayerProps> {
	render() {
		const model = this.props.model;
		let gs: JSX.Element[] = [];
		for (let c = 0; c < model.points.length; c++) {
			const contour = model.points[c];
			let zs: JSX.Element[] = [];
			for (let j = 0; j < contour.length; j++) {
				zs.push(<BSplineOnKnot contour={c} model={model} index={j} key={j} />);
			}
			gs.push(<g key={c}>{zs}</g>);
		}
		return gs;
	}
}

interface BSplineOnKnotProps {
	model: BSplineModel;
	contour: number;
	index: number;
}

@observer
export class BSplineOnKnot extends React.Component<BSplineOnKnotProps> {
	private handleDragStart: DraggableEventHandler = (e, data) => {
		e.preventDefault();
		e.stopPropagation();
		this.dragStartX = data.x;
		this.dragStartY = data.y;
	};
	private handleDrag: DraggableEventHandler = (e, data) => {
		this.doDrag(data.deltaX, data.deltaY);
	};
	private handleDragEnd: DraggableEventHandler = (e, data) => {
		e.preventDefault();
		e.stopPropagation();
		const xOffset = data.x - this.dragStartX;
		const yOffset = data.y - this.dragStartY;
		if (Math.abs(xOffset) < 1 && Math.abs(yOffset) < 1) {
			this.selectOnKnot();
		}
	};

	private dragStartX = 0;
	private dragStartY = 0;

	@action.bound
	private doDrag(dx: number, dy: number) {
		const { model, contour, index } = this.props;
		const kt = model.identifyOnKnotType(contour, index);
		if (kt === OnKnotType.Corner) {
			const ktM1 = model.identifyOnKnotType(contour, index - 1);
			const ktP1 = model.identifyOnKnotType(contour, index + 1);
			term(model.points[contour], index, 0).x += dx;
			term(model.points[contour], index, 0).y += dy;
			if (ktM1 === OnKnotType.CornerTangentBefore) {
				term(model.points[contour], index, -1).x += dx;
				term(model.points[contour], index, -1).y += dy;
			}
			if (ktP1 === OnKnotType.CornerTangentAfter) {
				term(model.points[contour], index, +1).x += dx;
				term(model.points[contour], index, +1).y += dy;
			}
		} else if (kt === OnKnotType.TangentStart) {
			term(model.points[contour], index, 0).x += dx;
			term(model.points[contour], index, 0).y += dy;
			term(model.points[contour], index, 1).x += dx;
			term(model.points[contour], index, 1).y += dy;
		} else if (kt === OnKnotType.TangentEnd) {
			term(model.points[contour], index, -1).x += dx;
			term(model.points[contour], index, -1).y += dy;
			term(model.points[contour], index, 0).x += dx;
			term(model.points[contour], index, 0).y += dy;
		} else {
			const coeff = model.coeffMatrix[contour][index][index];
			model.points[contour][index].x += dx / coeff;
			model.points[contour][index].y += dy / coeff;
		}
	}

	@action.bound
	private selectOnKnot() {
		const { model, contour, index } = this.props;
		model.selection = { type: "OnKnot", contourID: contour, knotID: index };
	}

	@action.bound
	private suppress<E>(e: React.MouseEvent<E>) {
		e.preventDefault();
		e.stopPropagation();
	}

	private get selected() {
		const { model, contour, index } = this.props;
		if (!model.selection || model.selection.type !== "OnKnot") return false;
		return model.selection.contourID === contour && model.selection.knotID === index;
	}

	render() {
		const { model, contour, index } = this.props;
		let x = 0,
			y = 0;
		for (let k = 0; k < model.points[contour].length; k++) {
			x += model.points[contour][k].x * model.coeffMatrix[contour][index][k];
			y += model.points[contour][k].y * model.coeffMatrix[contour][index][k];
		}
		const kt = model.identifyOnKnotType(contour, index);
		if (!(kt === OnKnotType.TangentStart || kt === OnKnotType.Smooth)) {
			return null;
		}
		const sk = this.selected ? "selected" : "";

		return (
			<DraggableCore
				onStart={this.handleDragStart}
				onDrag={this.handleDrag}
				onStop={this.handleDragEnd}
			>
				<circle
					cx={x}
					cy={y}
					r={4}
					className={"on-curve-control " + sk}
					onClick={this.suppress}
				/>
			</DraggableCore>
		);
	}
}
