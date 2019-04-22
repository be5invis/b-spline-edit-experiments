import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { DraggableCore, DraggableEventHandler } from "react-draggable";

import { term } from "../spline/array-util";
import { BSplineModel, OnKnotType } from "../spline/model";

import { LayerProps } from "./shared";

@observer
export class BSplineControls extends React.Component<LayerProps> {
	render() {
		const { model } = this.props;
		return this.props.model.points.map((zs, c) => (
			<g key={c}>
				{zs.map((z, j) => (
					<BSplineDirectControlPoint model={model} contour={c} index={j} key={j} />
				))}
			</g>
		));
	}
}
@observer
export class BSplineControlCage extends React.Component<LayerProps> {
	render() {
		const { model } = this.props;
		return this.props.model.points.map((zs, c) => (
			<g key={c}>
				{zs.map((z, j) => (
					<BSplineDirectControlEdge model={model} contour={c} index={j} key={j} />
				))}
			</g>
		));
	}
}

interface BSplineDirectControlPointProps extends LayerProps {
	contour: number;
	index: number;
}
@observer
export class BSplineDirectControlPoint extends React.Component<BSplineDirectControlPointProps> {
	private handleDrag: DraggableEventHandler = (e, data) => {
		const { model, contour, index } = this.props;
		const z = term(model.points[contour], index, 0);
		z.x += data.deltaX;
		z.y += data.deltaY;
	};
	render() {
		const { model, contour, index } = this.props;
		const kt = model.identifyOnKnotType(contour, index);
		const z = term(model.points[contour], index, 0);
		const sk =
			kt === OnKnotType.Smooth ? (model.showControlCage ? "smooth-off-knot" : "hide") : "";
		return (
			<DraggableCore onDrag={this.handleDrag}>
				<circle cx={z.x} cy={z.y} r={4} className={"control-cage-knot " + sk} />
			</DraggableCore>
		);
	}
}
interface BSplineDirectControlEdgeProps extends LayerProps {
	model: BSplineModel;
	contour: number;
	index: number;
}
@observer
export class BSplineDirectControlEdge extends React.Component<BSplineDirectControlEdgeProps> {
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
		const kt = model.identifyOnKnotType(contour, index);
		const ktNext = model.identifyOnKnotType(contour, index, +1);
		const z = term(model.points[contour], index, 0);
		const zNext = term(model.points[contour], index, 1);
		const sk =
			kt === OnKnotType.Corner && ktNext === OnKnotType.Corner
				? "hide"
				: kt === OnKnotType.Corner ||
				  kt === OnKnotType.CornerTangentBefore ||
				  kt === OnKnotType.TangentStart
				? "primary"
				: model.showControlCage
				? ""
				: "hide";
		const ask = sk && this.selected ? " selected" : "";
		return (
			<>
				<line
					x1={z.x}
					y1={z.y}
					x2={zNext.x}
					y2={zNext.y}
					className={"control-cage " + sk}
					onClick={this.selectArc}
				/>
				<line
					x1={z.x}
					y1={z.y}
					x2={zNext.x}
					y2={zNext.y}
					className={"control-cage-mask " + sk + ask}
					onClick={this.selectArc}
				/>
			</>
		);
	}
}
