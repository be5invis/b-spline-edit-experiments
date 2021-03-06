import { Button, ButtonGroup, Checkbox, Slider } from "@blueprintjs/core";
import { action } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";

import { evaluatePointT } from "../spline/b3";
import { BSplineModel, OnKnotType } from "../spline/model";

export interface KnotControlPanelProps {
	model: BSplineModel;
}

@observer
export class KnotControlPanel extends React.Component<KnotControlPanelProps> {
	private renderInner() {
		const { model } = this.props;
		if (!model.selection) return null;
		if (model.selection.type === "Arc") return <ArcController model={model} />;
		if (model.selection.type === "OnKnot") return <OnKnotController model={model} />;
		return null;
	}
	@action.bound
	private toggleShowControlCage() {
		const { model } = this.props;
		model.showControlCage = !model.showControlCage;
	}
	@action.bound
	private relax() {
		const { model } = this.props;

		for (const c of model.points) {
			let ki: number[] = [];
			for (let j = 0; j < c.length; j++) {
				const knot = c[j];
				ki[j] = knot.knotInterval;
				if (!knot.knotInterval) continue;
				let arcLength = 0;
				let z = evaluatePointT(c, j, 0);
				for (let t = 1; t <= 64; t++) {
					const z1 = evaluatePointT(c, j, t / 64);
					arcLength += Math.hypot(z.x - z1.x, z.y - z1.y);
					z = z1;
				}
				ki[j] = arcLength;
			}
			for (let j = 0; j < c.length; j++) {
				c[j].knotInterval = ki[j];
			}
		}
	}
	render() {
		const { model } = this.props;
		return (
			<div className="knot-control-panel">
				<Checkbox
					checked={model.showControlCage}
					onChange={this.toggleShowControlCage}
					label="Show control cage"
				/>
				<Button text="Relax" onClick={this.relax} />
				{this.renderInner()}
			</div>
		);
	}
}

function getControlKnot(model: BSplineModel, type: string, bias: number = 0) {
	if (!model.selection || model.selection.type !== type) return null;
	const contour = model.points[model.selection.contourID];
	if (!contour) return null;
	const ck = contour[model.selection.knotID + bias];
	if (!ck) return null;
	return ck;
}

@observer
export class ArcController extends React.Component<KnotControlPanelProps> {
	@action.bound
	private changeKnotInterval(x: number) {
		const ck = getControlKnot(this.props.model, "Arc");
		if (!ck) return;
		ck.knotInterval = x;
	}
	@action.bound
	private changeSHC() {
		const ck = getControlKnot(this.props.model, "Arc");
		if (!ck) return;
		ck.showHalfControl = !ck.showHalfControl;
	}
	render() {
		const ck = getControlKnot(this.props.model, "Arc");
		if (!ck) return null;
		return (
			<>
				<Checkbox
					label="Show Half Control"
					checked={ck.showHalfControl}
					onChange={this.changeSHC}
				/>
				<Slider
					min={0}
					max={1000}
					value={ck.knotInterval}
					labelStepSize={100}
					onChange={this.changeKnotInterval}
				/>
			</>
		);
	}
}

@observer
export class OnKnotController extends React.Component<KnotControlPanelProps> {
	@action.bound
	private makeCorner() {
		const ckPre = getControlKnot(this.props.model, "OnKnot", -1);
		const ck = getControlKnot(this.props.model, "OnKnot", 0);
		if (!ckPre || !ck) return;
		ckPre.knotInterval = ck.knotInterval = 0;
	}

	@action.bound
	private makeTangent() {
		const ckPre = getControlKnot(this.props.model, "OnKnot", -1);
		const ck = getControlKnot(this.props.model, "OnKnot", 0);
		if (!ckPre || !ck) return;
		ckPre.knotInterval = ckPre.knotInterval || 100;
		ck.knotInterval = 0;
	}
	@action.bound
	private makeSmooth() {
		const ckPre = getControlKnot(this.props.model, "OnKnot", -1);
		const ck = getControlKnot(this.props.model, "OnKnot", 0);
		if (!ckPre || !ck) return;
		ckPre.knotInterval = ckPre.knotInterval || 100;
		ck.knotInterval = ck.knotInterval || 100;
	}

	render() {
		const { model } = this.props;
		const ck = getControlKnot(this.props.model, "OnKnot");
		if (!ck) return null;
		const sel = model.selection!;
		const kt = model.identifyOnKnotType(sel.contourID, sel.knotID);

		return (
			<ButtonGroup>
				<Button
					text="Corner"
					icon="delta"
					active={kt === OnKnotType.Corner}
					onClick={this.makeCorner}
				/>
				<Button
					text="Tangent"
					icon="delta"
					active={kt === OnKnotType.TangentStart}
					onClick={this.makeTangent}
				/>
				<Button
					text="Smooth"
					icon="delta"
					active={kt === OnKnotType.Smooth}
					onClick={this.makeSmooth}
				/>
			</ButtonGroup>
		);
	}
}
