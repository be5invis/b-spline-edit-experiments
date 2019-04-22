import { action, observable } from "mobx";
import { observer } from "mobx-react";
import React, { Component } from "react";

import { findClosestJAndT } from "./spline/knot-insertion";
import { BSplineModel, BSplinePoint } from "./spline/model";
import { BSplineArcs } from "./view/b-spline-arcs";
import { BSplineControlCage, BSplineControls } from "./view/b-spline-controls";
import { BSplineDice, BSplineOnKnots } from "./view/b-spline-path";
import { KnotControlPanel } from "./view/knot-controls";

@observer
class App extends Component {
	@observable.ref
	model = new BSplineModel();

	componentDidMount() {
		const m = this.model;
		const zs: BSplinePoint[] = [];
		zs.push(BSplinePoint.at(100, 100).kd(100));
		zs.push(BSplinePoint.at(500, 100).kd(100));
		zs.push(BSplinePoint.at(500, 500).kd(100));
		zs.push(BSplinePoint.at(100, 500).kd(100));
		m.points.push(zs);
	}

	@action.bound
	private dice(e: React.MouseEvent<SVGSVGElement>) {
		e.preventDefault();
		e.stopPropagation();
		if (!this.refSvg.current) return;
		const rect = this.refSvg.current.getBoundingClientRect();
		for (let c = 0; c < this.model.points.length; c++) {
			const o = findClosestJAndT(
				this.model.points[c],
				32,
				4,
				e.clientX - rect.left,
				e.clientY - rect.top
			);
			if (o) {
				this.model.insertKnot(c, o.bestJ, o.bestT);
			}
		}
	}

	@action.bound
	private deSelect() {
		this.model.selection = null;
	}

	private refSvg = React.createRef<SVGSVGElement>();

	render() {
		return (
			<>
				<svg
					className="canvas"
					ref={this.refSvg}
					width={800}
					height={800}
					onClick={this.deSelect}
					onDoubleClick={this.dice}
				>
					<BSplineArcs model={this.model} />
					<BSplineControlCage model={this.model} />
					<BSplineOnKnots model={this.model} />
					<BSplineControls model={this.model} />
				</svg>
				<KnotControlPanel model={this.model} />
			</>
		);
	}
}

export default App;
