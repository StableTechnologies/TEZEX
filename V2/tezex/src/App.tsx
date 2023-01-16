import React, { FC } from "react";
import "./App.css";


import { Layout } from "./components/ui/views/Layout";
import { Outlet } from "react-router-dom";

/*
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
*/
export const App: FC = () => {
	return (
		<div className="App">
				<Layout>
					<Outlet />
				</Layout>
		</div>
	);
};

export default App;
