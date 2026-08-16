import React, { FC, useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Link from "@mui/material/Link";
import { useTheme } from "@mui/material/styles";
import { NetworkType } from "@airgap/beacon-sdk";
import { getNetworkSelectorStyles } from "./style";
import { useNetwork } from "../../../../../hooks/network";
import { getExplorer, getTzktApiUrl } from "../../../../../functions/util";
import { useLocation } from "react-router-dom";

interface NetworkOption {
  type: NetworkType;
  label: string;
}

interface BlockchainStats {
  cycle: number;
  level: number;
  timestamp: string;
}

interface CycleInfo {
  index: number;
  endTime: string;
}

interface NetworkSelectorProps {
  presentation?: "header" | "account";
}

const networks: NetworkOption[] = [
  { type: NetworkType.MAINNET, label: "Mainnet" },
  { type: NetworkType.SHADOWNET, label: "Shadownet" },
  { type: NetworkType.CUSTOM, label: "Previewnet" },
];

const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `in ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `in ${hours}h ${minutes % 60}min`;
  }

  return `in ${minutes}min`;
};

const formatNumber = (num: number): string => num.toLocaleString();

export const NetworkSelector: FC<NetworkSelectorProps> = ({
  presentation = "header",
}) => {
  const theme = useTheme();
  const network = useNetwork();
  const styles = getNetworkSelectorStyles(theme);
  const location = useLocation();
  const isStezRoute = location.pathname.startsWith("/stez");

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);

  const [timeToNextCycle, setTimeToNextCycle] = useState(0);
  const [timeToNextBlock, setTimeToNextBlock] = useState(8);

  const [displayLevel, setDisplayLevel] = useState(0);
  const [blockTimestamp, setBlockTimestamp] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const apiUrl = getTzktApiUrl(network.network);

      const headResponse = await fetch(`${apiUrl}/v1/head`);
      if (!headResponse.ok) {
        throw new Error(`TzKT head request failed (${headResponse.status})`);
      }
      const head = await headResponse.json();

      setStats({
        cycle: head.cycle,
        level: head.level,
        timestamp: head.timestamp,
      });

      setDisplayLevel(head.level);
      setBlockTimestamp(new Date(head.timestamp).getTime());

      const cycleResponse = await fetch(`${apiUrl}/v1/cycles/${head.cycle}`);
      if (cycleResponse.status === 204) {
        setCycleInfo(null);
        return;
      }
      if (!cycleResponse.ok) {
        throw new Error(`TzKT cycle request failed (${cycleResponse.status})`);
      }
      const cycle = await cycleResponse.json();

      setCycleInfo({
        index: cycle.index,
        endTime: cycle.endTime,
      });
    } catch (e) {
      console.error("Error fetching blockchain stats:", e);
    }
  };

  useEffect(() => {
    if (isStezRoute) return;
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [isStezRoute, network.network]);

  useEffect(() => {
    if (!cycleInfo) return;

    const tick = () => {
      const now = Date.now();
      const end = new Date(cycleInfo.endTime).getTime();
      setTimeToNextCycle(Math.max(0, Math.floor((end - now) / 1000)));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [cycleInfo]);

  useEffect(() => {
    if (!blockTimestamp) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - blockTimestamp) / 1000);
      setTimeToNextBlock(Math.max(0, 8 - elapsed));
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [blockTimestamp]);

  useEffect(() => {
    if (timeToNextBlock === 0) {
      setDisplayLevel((prev) => prev + 1);
      setBlockTimestamp(Date.now());
    }
  }, [timeToNextBlock]);

  const open = Boolean(anchorEl);
  const currentNetwork = networks.find((n) => n.type === network.network);
  const networkLabel = isStezRoute
    ? "Snet"
    : currentNetwork?.label ?? "Mainnet";
  const isAccountPresentation = presentation === "account";

  return (
    <>
      {/* Network button */}
      <Box
        component="button"
        type="button"
        aria-label={`Network: ${networkLabel}, live`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={isAccountPresentation ? styles.accountButton : styles.button}
      >
        {isAccountPresentation && (
          <Typography sx={styles.accountButtonLabel}>Network</Typography>
        )}

        <Box sx={styles.accountButtonValue}>
          <Box aria-hidden="true" sx={styles.liveSignal} />

          <Box data-network-label sx={styles.networkIdentity}>
            <Typography sx={styles.networkLabel}>{networkLabel}</Typography>
          </Box>

          <Box
            data-network-arrow
            sx={{
              ...styles.arrow,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <Box component="span" sx={styles.arrowGlyph} />
          </Box>
        </Box>
      </Box>

      {/* Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: isAccountPresentation ? "right" : "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: isAccountPresentation ? "right" : "left",
        }}
        PaperProps={{ sx: styles.popover }}
      >
        {isStezRoute ? (
          <>
            <Box sx={styles.infoSection}>
              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Current network</Typography>
                <Typography sx={styles.infoValue}>Snet</Typography>
              </Box>
              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Network type</Typography>
                <Typography sx={styles.infoValue}>Public testnet</Typography>
              </Box>
              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Status</Typography>
                <Box sx={styles.statusValue}>
                  <Box aria-hidden="true" sx={styles.statusDot} />
                  Live
                </Box>
              </Box>
            </Box>
            <Link
              href="https://teztnets.com/snet-about"
              target="_blank"
              rel="noopener noreferrer"
              sx={styles.networkDetailsLink}
              underline="none"
            >
              Snet network details
              <Box
                component="svg"
                viewBox="0 0 12 12"
                aria-hidden="true"
                sx={styles.externalArrow}
              >
                <path d="M4 2h6v6M10 2 2 10" />
              </Box>
            </Link>
          </>
        ) : (
          <>
            <Box sx={styles.infoSection}>
              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Current cycle</Typography>
                <Typography sx={styles.infoValue}>
                  {stats ? `#${stats.cycle}` : "..."}
                </Typography>
              </Box>

              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Next cycle</Typography>
                <Typography sx={styles.infoValue}>
                  {cycleInfo ? formatTimeRemaining(timeToNextCycle) : "..."}
                </Typography>
              </Box>

              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Latest block</Typography>
                <Link
                  href={`${getExplorer(network.network)}${displayLevel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={styles.infoLink}
                  underline="hover"
                >
                  {displayLevel ? formatNumber(displayLevel) : "..."}
                </Link>
              </Box>

              <Box sx={styles.infoRow}>
                <Typography sx={styles.infoLabel}>Next block</Typography>
                <Typography sx={styles.infoValue}>
                  {formatTimeRemaining(timeToNextBlock)}
                </Typography>
              </Box>
            </Box>

            <List sx={{ p: 0 }}>
              {networks.map((net) => (
                <ListItem key={net.type} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      if (net.type !== network.network) {
                        network.switchNetwork(net.type);
                      }
                      setAnchorEl(null);
                    }}
                    selected={net.type === network.network}
                    sx={styles.listItem}
                  >
                    <Typography
                      sx={{
                        ...styles.listItemText,
                        fontWeight: net.type === network.network ? 600 : 400,
                      }}
                    >
                      {net.label}
                    </Typography>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Popover>
    </>
  );
};
