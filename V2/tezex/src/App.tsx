import React, { FC } from "react";
import "./App.css";

import {
	Route,
	BrowserRouter as Router,
	Routes,
} from "react-router-dom";

import { Layout } from "./components/ui/views/Layout";
import { Home } from "./pages/Home";
import { Analytics } from "./pages/Analytics";
import { About } from "./pages/About";

export const App: FC = () => {
	return (
		<div className="App">
			<Router basename={process.env.PUBLIC_URL}>
				<header className="App-header">
						<Layout>
							<Routes>
								<Route path="/Home" element={<Home />} />
								<Route path="/Analytics" element={<Analytics />} />
								<Route path="/About" element={<About />} />
							</Routes>
						</Layout>
				</header>
			</Router>
		</div>
	);
};

export default App;
