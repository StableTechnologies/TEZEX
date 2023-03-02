import React, { FC } from "react";
import "./App.css";


import { Layout } from "./components/ui/views/Layout";
import { Outlet } from "react-router-dom";


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
