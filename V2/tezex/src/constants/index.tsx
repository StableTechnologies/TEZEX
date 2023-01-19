import { TokenKind, Asset } from "../types/general";
import tzbtcLogo from "../assets/tzbtcLogo.svg";
import tzlogo from "../assets/tzlogo.svg"
export const assets: Asset[] = [
	{
	name: TokenKind.XTZ,
		label: 'Tez',
	logo: tzlogo

	},
	{
	name: TokenKind.TzBTC,
	label: TokenKind.TzBTC as string,
	logo: tzbtcLogo
	},
	{
	name: TokenKind.Sirius,
	label: 'Sirs', 
	logo: ""
	},
]
 
export const XTZ: Asset = assets[0];
export const TzBTC = assets[1];
export const SIRS = assets[2];

export function getAsset(token: TokenKind) : Asset {

	switch(token) {
		case TokenKind.TzBTC :
			return TzBTC;
		case TokenKind.XTZ :
			return XTZ;
		case TokenKind.Sirius :
			return SIRS;
	}
}
