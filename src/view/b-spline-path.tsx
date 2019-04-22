import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";

import { term } from "../spline/array-util";
import {
	evaluateCoefficientsT,
	evaluateDerivativeCoefficientsT,
	evaluatePointT
} from "../spline/b3";
import { BSplineModel, OnKnotType } from "../spline/model";

import { LayerProps } from "./shared";

const DICE = 2;
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

					const dCoeff = evaluateDerivativeCoefficientsT(contour, j, d / DICE);
					let zdx: number = z.x,
						zdy: number = z.y;
					for (let k = 0; k < contour.length; k++) {
						zdx += dCoeff[k] * contour[k].x;
						zdy += dCoeff[k] * contour[k].y;
					}
					zs.push(
						<line
							x1={z.x}
							y1={z.y}
							x2={zdx}
							y2={zdy}
							key={j + "/" + d + "/deriv"}
							stroke="black"
						/>
					);
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
				zs.push(<BSplineOnKnot contour={c} model={model} index={j} key={j + "/0"} />);
				zs.push(
					<BSplineHalfEdgeNormalKnot contour={c} model={model} index={j} key={j + "/n"} />
				);
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

@observer
export class BSplineHalfEdgeNormalKnot extends React.Component<BSplineOnKnotProps> {
	@action.bound
	private suppress<E>(e: React.MouseEvent<E>) {
		e.preventDefault();
		e.stopPropagation();
	}

	private handleDragKnot: DraggableEventHandler = (e, data) => {
		this.doDragKnot(data.deltaX, data.deltaY);
	};

	private handleDragNormal: DraggableEventHandler = (e, data) => {
		this.doDragNormal(-data.deltaY, data.deltaX);
	};

	@action.bound
	private doDragKnot(dx: number, dy: number) {
		const { model, contour, index } = this.props;
		const coefficients = evaluateCoefficientsT(model.points[contour], index, 1 / 2);
		const coeffBefore = term(coefficients, index, 0),
			coeffAfter = term(coefficients, index, 1);
		const sqCoeffTotal = coeffBefore + coeffAfter;
		if (sqCoeffTotal) {
			const zBefore = term(model.points[contour], index, 0);
			const zAfter = term(model.points[contour], index, 1);
			zBefore.x += dx / sqCoeffTotal;
			zBefore.y += dy / sqCoeffTotal;
			zAfter.x += dx / sqCoeffTotal;
			zAfter.y += dy / sqCoeffTotal;
		}
	}

	@action.bound
	private doDragNormal(dx: number, dy: number) {
		const { model, contour, index } = this.props;
		const coefficients = evaluateDerivativeCoefficientsT(model.points[contour], index, 1 / 2);
		const zCoefficients = evaluateCoefficientsT(model.points[contour], index, 1 / 2);
		const dCoeffBefore = term(coefficients, index, 0),
			dCoeffAfter = term(coefficients, index, 1);
		const zCoeffBefore = term(zCoefficients, index, 0),
			zCoeffAfter = term(zCoefficients, index, 1);

		const det = dCoeffBefore * zCoeffAfter - dCoeffAfter * zCoeffBefore;
		if (Math.abs(det) > 1e-6) {
			const sBefore = zCoeffAfter / det;
			const sAfter = -zCoeffBefore / det;
			const zBefore = term(model.points[contour], index, 0);
			const zAfter = term(model.points[contour], index, 1);

			zBefore.x += dx * sBefore;
			zBefore.y += dy * sBefore;
			zAfter.x += dx * sAfter;
			zAfter.y += dy * sAfter;
		}
	}

	render() {
		const { model, contour, index } = this.props;
		const ki = model.points[contour][index];
		if (ki.knotInterval <= 0 || !ki.showHalfControl) return null;
		let x = 0,
			y = 0;
		const coeff = evaluateDerivativeCoefficientsT(model.points[contour], index, 1 / 2);
		for (let k = 0; k < model.points[contour].length; k++) {
			x += model.points[contour][k].x * coeff[k];
			y += model.points[contour][k].y * coeff[k];
		}
		const z = evaluatePointT(model.points[contour], index, 1 / 2);

		const sk = "";
		return (
			<g>
				<line
					x1={z.x}
					y1={z.y}
					x2={z.x + y}
					y2={z.y - x}
					className="on-curve-half-control-line"
				/>
				<DraggableCore onDrag={this.handleDragKnot}>
					<circle
						cx={z.x}
						cy={z.y}
						r={4}
						className={"on-curve-half-control " + sk}
						onClick={this.suppress}
					/>
				</DraggableCore>

				<DraggableCore onDrag={this.handleDragNormal}>
					<circle
						cx={z.x + y}
						cy={z.y - x}
						r={4}
						className={"on-curve-half-control " + sk}
						onClick={this.suppress}
					/>
				</DraggableCore>
			</g>
		);
	}
}
