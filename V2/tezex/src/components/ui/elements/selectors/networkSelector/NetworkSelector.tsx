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
import { getExplorer } from "../../../../../functions/util";

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
  startTime: string;
}

const networks: NetworkOption[] = [
  { type: NetworkType.MAINNET, label: "Mainnet" },
  { type: NetworkType.SHADOWNET, label: "Shadownet" },
];

const getTzktApiUrl = (networkType: NetworkType): string => {
  switch (networkType) {
    case NetworkType.MAINNET:
      return "https://api.tzkt.io";
    case NetworkType.SHADOWNET:
      return "https://api.shadownet.tzkt.io";
    default:
      return "https://api.tzkt.io";
  }
};

const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `in ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `in ${hours}h ${minutes % 60}min`;
  }

  return `in ${minutes}min`;
};

const formatCycleTimeShort = (seconds: number): string =>
  `${Math.floor(seconds / 3600)}h`;

const formatNumber = (num: number): string => num.toLocaleString();

export const NetworkSelector: FC = () => {
  const theme = useTheme();
  const network = useNetwork();
  const styles = getNetworkSelectorStyles(theme, network.network);

  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [stats, setStats] = useState<BlockchainStats | null>(null);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const [timeToNextCycle, setTimeToNextCycle] = useState(0);
  const [timeToNextBlock, setTimeToNextBlock] = useState(8);

  const [displayLevel, setDisplayLevel] = useState(0);
  const [blockTimestamp, setBlockTimestamp] = useState<number | null>(null);
  const [cycleProgress, setCycleProgress] = useState<number>(0); // Cycle progress 0-100

  const fetchStats = async () => {
    setLoading(true);
    try {
      const apiUrl = getTzktApiUrl(network.network);

      const head = await fetch(`${apiUrl}/v1/head`).then((r) => r.json());

      setStats({
        cycle: head.cycle,
        level: head.level,
        timestamp: head.timestamp,
      });

      setDisplayLevel(head.level);
      setBlockTimestamp(new Date(head.timestamp).getTime());

      const cycle = await fetch(`${apiUrl}/v1/cycles/${head.cycle}`).then((r) =>
        r.json()
      );

      setCycleInfo({
        index: cycle.index,
        endTime: cycle.endTime,
        startTime: cycle.startTime,
      });
    } catch (e) {
      console.error("Error fetching blockchain stats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [network.network]);

  useEffect(() => {
    if (!cycleInfo) return;

    const updateCycleTimer = () => {
      const now = new Date().getTime();
      const startTime = new Date(cycleInfo.startTime).getTime();
      const endTime = new Date(cycleInfo.endTime).getTime();
      const totalDuration = endTime - startTime;
      const elapsed = now - startTime;

      const remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeToNextCycle(remainingSeconds);

      const progress = Math.min(
        100,
        Math.max(0, (elapsed / totalDuration) * 100)
      );
      setCycleProgress(progress);
    };

    updateCycleTimer();
    const timer = setInterval(updateCycleTimer, 10000);

    return () => clearInterval(timer);
  }, [cycleInfo]);

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

  return (
    <>
      {/* Network button */}
      <Box onClick={(e) => setAnchorEl(e.currentTarget)} sx={styles.button}>
        <Box sx={{ position: "relative", display: "flex" }}>
          <svg
            viewBox="0 0 100 100"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-90deg)",
              width: "calc(100% + 4px)",
              height: "calc(100% + 4px)",
              pointerEvents: "none",
            }}
          >
            <circle
              cx="48"
              cy="48"
              r="45"
              fill="none"
              stroke={
                network.network === NetworkType.MAINNET ? "#3b82f6" : "#64748b"
              }
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * (50 - 3)}`}
              strokeDashoffset={`${
                2 * Math.PI * (50 - 3) * (1 - cycleProgress / 100)
              }`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>

          <Box sx={styles.iconCircle}>
            {loading || !cycleInfo
              ? "..."
              : formatCycleTimeShort(timeToNextCycle)}
          </Box>
        </Box>

        <Typography sx={styles.networkLabel}>
          {currentNetwork?.label ?? "Mainnet"}
        </Typography>

        <Box
          sx={{
            ...styles.arrow,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          ▼
        </Box>
      </Box>

      {/* Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: styles.popover }}
      >
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
      </Popover>
    </>
  );
};
