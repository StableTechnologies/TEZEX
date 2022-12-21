import React, { FC } from "react";
import "./App.css";

import {
	Route,
	BrowserRouter as Router,
	Routes,
} from "react-router-dom";

import { Layout } from "./components/ui/views/Layout";
import { Swap } from "./pages/swap";
import { AddLiquidity } from "./pages/addLiquidity";
import { RemoveLiquidity } from "./pages/removeLiquidity";

export const App: FC = () => {
	return (
		<div className="App">
			<Router basename={process.env.PUBLIC_URL}>
				<header className="App-header">
					<p>
						<Layout>
							<Routes>
								<Route path="/swap" element={<Swap />} />
								<Route path="/add" element={<AddLiquidity />} />
								<Route path="/remove" element={<RemoveLiquidity />} />
							</Routes>
						</Layout>
					</p>
				</header>
			</Router>
		</div>
	);
};

export default App;
