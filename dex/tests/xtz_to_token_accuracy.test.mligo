#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter.mligo" "Dexter"
#import "./util.mligo" "Util"

module Test = Test.Next

module Tezos = Tezos.Next

(* Helper to test quote vs actual swap for xtz_to_token *)
let test_quote_accuracy
  (test_name : string)
  (xtz_pool : tez)
  (token_pool : nat)
  (lqt_total : nat)
  (swap_amount : tez)
: unit =
  let (dex_orig, _, tok_orig) = Util.setup_custom_dex xtz_pool token_pool lqt_total in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Get initial balance *)
  let storage_before = Test.Typed_address.get_storage tok_orig.taddr in
  let initial_balance =
    match Big_map.find_opt (Util.src ()) storage_before.tokens with
      None -> 0n
    | Some b -> b in
  (* Get quote *)
  let tez_in = swap_amount / 1mutez in
  let quote_result : nat option = Tezos.View.call "quote_tez_to_token" tez_in dex_address in
  match quote_result with
    None -> failwith (test_name ^ ": quote_tez_to_token view failed")
  | Some quoted_tokens ->
      (* Perform actual swap *)
      let swap_param : Dexter.Dexter.xtz_to_token =
        {
         to_ = Util.src ();
         minTokensBought = quoted_tokens;
         deadline = Util.future
        } in
      let _ : nat =
        Test.Typed_address.transfer_exn dex_orig.taddr (XtzToToken swap_param) swap_amount in
      (* Check actual tokens received *)
      let storage_after = Test.Typed_address.get_storage tok_orig.taddr in
      let final_balance =
        match Big_map.find_opt (Util.src ()) storage_after.tokens with
          None -> 0n
        | Some b -> b in
      let tokens_received = abs (final_balance - initial_balance) in
      let diff = abs (quoted_tokens - tokens_received) in
      if diff > 0n then failwith (test_name ^ ": quote differs from actual by more than 0") else ()

(*****************************************************************************)
(* XTZ to Token Quote Tests - Small Pools (1-10 tez)                        *)
(*****************************************************************************)
let test_xtz_to_token_001 = test_quote_accuracy "xtt_001" 1tez 1000000n 1000000n 0.1tez

let test_xtz_to_token_002 = test_quote_accuracy "xtt_002" 1tez 1000000n 1000000n 0.5tez

let test_xtz_to_token_003 = test_quote_accuracy "xtt_003" 2tez 2000000n 2000000n 0.2tez

let test_xtz_to_token_004 = test_quote_accuracy "xtt_004" 3tez 3000000n 3000000n 0.3tez

let test_xtz_to_token_005 = test_quote_accuracy "xtt_005" 5tez 5000000n 5000000n 0.5tez

let test_xtz_to_token_006 = test_quote_accuracy "xtt_006" 5tez 5000000n 5000000n 1tez

let test_xtz_to_token_007 = test_quote_accuracy "xtt_007" 10tez 10000000n 10000000n 1tez

let test_xtz_to_token_008 = test_quote_accuracy "xtt_008" 10tez 10000000n 10000000n 2tez

let test_xtz_to_token_009 = test_quote_accuracy "xtt_009" 1tez 500000n 1000000n 0.1tez

let test_xtz_to_token_010 = test_quote_accuracy "xtt_010" 1tez 2000000n 1000000n 0.1tez

let test_xtz_to_token_011 = test_quote_accuracy "xtt_011" 2tez 1000000n 2000000n 0.2tez

let test_xtz_to_token_012 = test_quote_accuracy "xtt_012" 3tez 1500000n 3000000n 0.3tez

let test_xtz_to_token_013 = test_quote_accuracy "xtt_013" 5tez 2500000n 5000000n 0.5tez

let test_xtz_to_token_014 = test_quote_accuracy "xtt_014" 7tez 3500000n 7000000n 0.7tez

let test_xtz_to_token_015 = test_quote_accuracy "xtt_015" 8tez 4000000n 8000000n 0.8tez

let test_xtz_to_token_016 = test_quote_accuracy "xtt_016" 9tez 4500000n 9000000n 0.9tez

let test_xtz_to_token_017 = test_quote_accuracy "xtt_017" 1tez 1000000n 500000n 0.05tez

let test_xtz_to_token_018 = test_quote_accuracy "xtt_018" 2tez 2000000n 1000000n 0.1tez

let test_xtz_to_token_019 = test_quote_accuracy "xtt_019" 3tez 3000000n 1500000n 0.15tez

let test_xtz_to_token_020 = test_quote_accuracy "xtt_020" 4tez 4000000n 2000000n 0.2tez

let test_xtz_to_token_021 = test_quote_accuracy "xtt_021" 1.5tez 1500000n 1500000n 0.15tez

let test_xtz_to_token_022 = test_quote_accuracy "xtt_022" 2.5tez 2500000n 2500000n 0.2tez

let test_xtz_to_token_023 = test_quote_accuracy "xtt_023" 3.5tez 3500000n 3500000n 0.35tez

let test_xtz_to_token_024 = test_quote_accuracy "xtt_024" 4.5tez 4500000n 4500000n 0.45tez

let test_xtz_to_token_025 = test_quote_accuracy "xtt_025" 6tez 6000000n 6000000n 0.6tez

let test_xtz_to_token_026 = test_quote_accuracy "xtt_026" 7tez 7000000n 7000000n 0.7tez

let test_xtz_to_token_027 = test_quote_accuracy "xtt_027" 8tez 8000000n 8000000n 0.8tez

let test_xtz_to_token_028 = test_quote_accuracy "xtt_028" 9tez 9000000n 9000000n 0.9tez

let test_xtz_to_token_029 = test_quote_accuracy "xtt_029" 1tez 750000n 1000000n 0.06tez

let test_xtz_to_token_030 = test_quote_accuracy "xtt_030" 1tez 1250000n 1000000n 0.1tez

let test_xtz_to_token_031 = test_quote_accuracy "xtt_031" 2tez 1500000n 2000000n 0.15tez

let test_xtz_to_token_032 = test_quote_accuracy "xtt_032" 2tez 2500000n 2000000n 0.2tez

let test_xtz_to_token_033 = test_quote_accuracy "xtt_033" 3tez 2250000n 3000000n 0.18tez

let test_xtz_to_token_034 = test_quote_accuracy "xtt_034" 3tez 3750000n 3000000n 0.3tez

let test_xtz_to_token_035 = test_quote_accuracy "xtt_035" 5tez 3750000n 5000000n 0.3tez

let test_xtz_to_token_036 = test_quote_accuracy "xtt_036" 5tez 6250000n 5000000n 0.5tez

let test_xtz_to_token_037 = test_quote_accuracy "xtt_037" 10tez 7500000n 10000000n 0.6tez

let test_xtz_to_token_038 = test_quote_accuracy "xtt_038" 10tez 12500000n 10000000n 1tez

let test_xtz_to_token_039 = test_quote_accuracy "xtt_039" 1tez 900000n 1000000n 0.09tez

let test_xtz_to_token_040 = test_quote_accuracy "xtt_040" 1tez 1100000n 1000000n 0.11tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Medium Pools (10-100 tez)                     *)
(*****************************************************************************)
let test_xtz_to_token_041 = test_quote_accuracy "xtt_041" 20tez 20000000n 20000000n 2tez

let test_xtz_to_token_042 = test_quote_accuracy "xtt_042" 30tez 30000000n 30000000n 3tez

let test_xtz_to_token_043 = test_quote_accuracy "xtt_043" 40tez 40000000n 40000000n 4tez

let test_xtz_to_token_044 = test_quote_accuracy "xtt_044" 50tez 50000000n 50000000n 5tez

let test_xtz_to_token_045 = test_quote_accuracy "xtt_045" 60tez 60000000n 60000000n 6tez

let test_xtz_to_token_046 = test_quote_accuracy "xtt_046" 70tez 70000000n 70000000n 7tez

let test_xtz_to_token_047 = test_quote_accuracy "xtt_047" 80tez 80000000n 80000000n 8tez

let test_xtz_to_token_048 = test_quote_accuracy "xtt_048" 90tez 90000000n 90000000n 9tez

let test_xtz_to_token_049 = test_quote_accuracy "xtt_049" 100tez 100000000n 100000000n 10tez

let test_xtz_to_token_050 = test_quote_accuracy "xtt_050" 15tez 15000000n 15000000n 1.5tez

let test_xtz_to_token_051 = test_quote_accuracy "xtt_051" 25tez 25000000n 25000000n 2.5tez

let test_xtz_to_token_052 = test_quote_accuracy "xtt_052" 35tez 35000000n 35000000n 3.5tez

let test_xtz_to_token_053 = test_quote_accuracy "xtt_053" 45tez 45000000n 45000000n 4.5tez

let test_xtz_to_token_054 = test_quote_accuracy "xtt_054" 55tez 55000000n 55000000n 5.5tez

let test_xtz_to_token_055 = test_quote_accuracy "xtt_055" 65tez 65000000n 65000000n 6.5tez

let test_xtz_to_token_056 = test_quote_accuracy "xtt_056" 75tez 75000000n 75000000n 7.5tez

let test_xtz_to_token_057 = test_quote_accuracy "xtt_057" 85tez 85000000n 85000000n 8.5tez

let test_xtz_to_token_058 = test_quote_accuracy "xtt_058" 95tez 95000000n 95000000n 9.5tez

let test_xtz_to_token_059 = test_quote_accuracy "xtt_059" 20tez 10000000n 20000000n 2tez

let test_xtz_to_token_060 = test_quote_accuracy "xtt_060" 30tez 15000000n 30000000n 3tez

let test_xtz_to_token_061 = test_quote_accuracy "xtt_061" 40tez 20000000n 40000000n 4tez

let test_xtz_to_token_062 = test_quote_accuracy "xtt_062" 50tez 25000000n 50000000n 5tez

let test_xtz_to_token_063 = test_quote_accuracy "xtt_063" 60tez 30000000n 60000000n 6tez

let test_xtz_to_token_064 = test_quote_accuracy "xtt_064" 70tez 35000000n 70000000n 7tez

let test_xtz_to_token_065 = test_quote_accuracy "xtt_065" 80tez 40000000n 80000000n 8tez

let test_xtz_to_token_066 = test_quote_accuracy "xtt_066" 90tez 45000000n 90000000n 9tez

let test_xtz_to_token_067 = test_quote_accuracy "xtt_067" 100tez 50000000n 100000000n 10tez

let test_xtz_to_token_068 = test_quote_accuracy "xtt_068" 20tez 40000000n 20000000n 2tez

let test_xtz_to_token_069 = test_quote_accuracy "xtt_069" 30tez 60000000n 30000000n 3tez

let test_xtz_to_token_070 = test_quote_accuracy "xtt_070" 40tez 80000000n 40000000n 4tez

let test_xtz_to_token_071 = test_quote_accuracy "xtt_071" 50tez 100000000n 50000000n 5tez

let test_xtz_to_token_072 = test_quote_accuracy "xtt_072" 60tez 120000000n 60000000n 6tez

let test_xtz_to_token_073 = test_quote_accuracy "xtt_073" 70tez 140000000n 70000000n 7tez

let test_xtz_to_token_074 = test_quote_accuracy "xtt_074" 80tez 160000000n 80000000n 8tez

let test_xtz_to_token_075 = test_quote_accuracy "xtt_075" 90tez 180000000n 90000000n 9tez

let test_xtz_to_token_076 = test_quote_accuracy "xtt_076" 100tez 200000000n 100000000n 10tez

let test_xtz_to_token_077 = test_quote_accuracy "xtt_077" 12tez 12000000n 12000000n 1.2tez

let test_xtz_to_token_078 = test_quote_accuracy "xtt_078" 18tez 18000000n 18000000n 1.8tez

let test_xtz_to_token_079 = test_quote_accuracy "xtt_079" 22tez 22000000n 22000000n 2.2tez

let test_xtz_to_token_080 = test_quote_accuracy "xtt_080" 28tez 28000000n 28000000n 2.8tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Large Pools (100-1000 tez)                    *)
(*****************************************************************************)
let test_xtz_to_token_081 = test_quote_accuracy "xtt_081" 200tez 200000000n 200000000n 20tez

let test_xtz_to_token_082 = test_quote_accuracy "xtt_082" 300tez 300000000n 300000000n 30tez

let test_xtz_to_token_083 = test_quote_accuracy "xtt_083" 400tez 400000000n 400000000n 40tez

let test_xtz_to_token_084 = test_quote_accuracy "xtt_084" 500tez 500000000n 500000000n 50tez

let test_xtz_to_token_085 = test_quote_accuracy "xtt_085" 600tez 600000000n 600000000n 60tez

let test_xtz_to_token_086 = test_quote_accuracy "xtt_086" 700tez 700000000n 700000000n 70tez

let test_xtz_to_token_087 = test_quote_accuracy "xtt_087" 800tez 800000000n 800000000n 80tez

let test_xtz_to_token_088 = test_quote_accuracy "xtt_088" 900tez 900000000n 900000000n 90tez

let test_xtz_to_token_089 = test_quote_accuracy "xtt_089" 1000tez 1000000000n 1000000000n 100tez

let test_xtz_to_token_090 = test_quote_accuracy "xtt_090" 150tez 150000000n 150000000n 15tez

let test_xtz_to_token_091 = test_quote_accuracy "xtt_091" 250tez 250000000n 250000000n 25tez

let test_xtz_to_token_092 = test_quote_accuracy "xtt_092" 350tez 350000000n 350000000n 35tez

let test_xtz_to_token_093 = test_quote_accuracy "xtt_093" 450tez 450000000n 450000000n 45tez

let test_xtz_to_token_094 = test_quote_accuracy "xtt_094" 550tez 550000000n 550000000n 55tez

let test_xtz_to_token_095 = test_quote_accuracy "xtt_095" 650tez 650000000n 650000000n 65tez

let test_xtz_to_token_096 = test_quote_accuracy "xtt_096" 750tez 750000000n 750000000n 75tez

let test_xtz_to_token_097 = test_quote_accuracy "xtt_097" 850tez 850000000n 850000000n 85tez

let test_xtz_to_token_098 = test_quote_accuracy "xtt_098" 950tez 950000000n 950000000n 95tez

let test_xtz_to_token_099 = test_quote_accuracy "xtt_099" 200tez 100000000n 200000000n 20tez

let test_xtz_to_token_100 = test_quote_accuracy "xtt_100" 300tez 150000000n 300000000n 30tez

let test_xtz_to_token_101 = test_quote_accuracy "xtt_101" 400tez 200000000n 400000000n 40tez

let test_xtz_to_token_102 = test_quote_accuracy "xtt_102" 500tez 250000000n 500000000n 50tez

let test_xtz_to_token_103 = test_quote_accuracy "xtt_103" 600tez 300000000n 600000000n 60tez

let test_xtz_to_token_104 = test_quote_accuracy "xtt_104" 700tez 350000000n 700000000n 70tez

let test_xtz_to_token_105 = test_quote_accuracy "xtt_105" 800tez 400000000n 800000000n 80tez

let test_xtz_to_token_106 = test_quote_accuracy "xtt_106" 900tez 450000000n 900000000n 90tez

let test_xtz_to_token_107 = test_quote_accuracy "xtt_107" 1000tez 500000000n 1000000000n 100tez

let test_xtz_to_token_108 = test_quote_accuracy "xtt_108" 200tez 400000000n 200000000n 20tez

let test_xtz_to_token_109 = test_quote_accuracy "xtt_109" 300tez 600000000n 300000000n 30tez

let test_xtz_to_token_110 = test_quote_accuracy "xtt_110" 400tez 800000000n 400000000n 40tez

let test_xtz_to_token_111 = test_quote_accuracy "xtt_111" 500tez 1000000000n 500000000n 50tez

let test_xtz_to_token_112 = test_quote_accuracy "xtt_112" 600tez 1200000000n 600000000n 60tez

let test_xtz_to_token_113 = test_quote_accuracy "xtt_113" 700tez 1400000000n 700000000n 70tez

let test_xtz_to_token_114 = test_quote_accuracy "xtt_114" 800tez 1600000000n 800000000n 80tez

let test_xtz_to_token_115 = test_quote_accuracy "xtt_115" 900tez 1800000000n 900000000n 90tez

let test_xtz_to_token_116 = test_quote_accuracy "xtt_116" 1000tez 2000000000n 1000000000n 100tez

let test_xtz_to_token_117 = test_quote_accuracy "xtt_117" 120tez 120000000n 120000000n 12tez

let test_xtz_to_token_118 = test_quote_accuracy "xtt_118" 180tez 180000000n 180000000n 18tez

let test_xtz_to_token_119 = test_quote_accuracy "xtt_119" 220tez 220000000n 220000000n 22tez

let test_xtz_to_token_120 = test_quote_accuracy "xtt_120" 280tez 280000000n 280000000n 28tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Very Large Pools (1000+ tez)                  *)
(*****************************************************************************)
let test_xtz_to_token_121 = test_quote_accuracy "xtt_121" 2000tez 2000000000n 2000000000n 200tez

let test_xtz_to_token_122 = test_quote_accuracy "xtt_122" 3000tez 3000000000n 3000000000n 300tez

let test_xtz_to_token_123 = test_quote_accuracy "xtt_123" 4000tez 4000000000n 4000000000n 400tez

let test_xtz_to_token_124 = test_quote_accuracy "xtt_124" 5000tez 5000000000n 5000000000n 500tez

let test_xtz_to_token_125 = test_quote_accuracy "xtt_125" 1500tez 1500000000n 1500000000n 150tez

let test_xtz_to_token_126 = test_quote_accuracy "xtt_126" 2500tez 2500000000n 2500000000n 250tez

let test_xtz_to_token_127 = test_quote_accuracy "xtt_127" 3500tez 3500000000n 3500000000n 350tez

let test_xtz_to_token_128 = test_quote_accuracy "xtt_128" 4500tez 4500000000n 4500000000n 450tez

let test_xtz_to_token_129 = test_quote_accuracy "xtt_129" 2000tez 1000000000n 2000000000n 200tez

let test_xtz_to_token_130 = test_quote_accuracy "xtt_130" 3000tez 1500000000n 3000000000n 300tez

let test_xtz_to_token_131 = test_quote_accuracy "xtt_131" 4000tez 2000000000n 4000000000n 400tez

let test_xtz_to_token_132 = test_quote_accuracy "xtt_132" 5000tez 2500000000n 5000000000n 500tez

let test_xtz_to_token_133 = test_quote_accuracy "xtt_133" 2000tez 4000000000n 2000000000n 200tez

let test_xtz_to_token_134 = test_quote_accuracy "xtt_134" 3000tez 6000000000n 3000000000n 300tez

let test_xtz_to_token_135 = test_quote_accuracy "xtt_135" 4000tez 8000000000n 4000000000n 400tez

let test_xtz_to_token_136 = test_quote_accuracy "xtt_136" 5000tez 10000000000n 5000000000n 500tez

let test_xtz_to_token_137 = test_quote_accuracy "xtt_137" 1200tez 1200000000n 1200000000n 120tez

let test_xtz_to_token_138 = test_quote_accuracy "xtt_138" 1800tez 1800000000n 1800000000n 180tez

let test_xtz_to_token_139 = test_quote_accuracy "xtt_139" 2200tez 2200000000n 2200000000n 220tez

let test_xtz_to_token_140 = test_quote_accuracy "xtt_140" 2800tez 2800000000n 2800000000n 280tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Tiny Swaps                                    *)
(*****************************************************************************)
let test_xtz_to_token_141 = test_quote_accuracy "xtt_141" 100tez 100000000n 100000000n 0.001tez

let test_xtz_to_token_142 = test_quote_accuracy "xtt_142" 100tez 100000000n 100000000n 0.005tez

let test_xtz_to_token_143 = test_quote_accuracy "xtt_143" 100tez 100000000n 100000000n 0.01tez

let test_xtz_to_token_144 = test_quote_accuracy "xtt_144" 100tez 100000000n 100000000n 0.05tez

let test_xtz_to_token_145 = test_quote_accuracy "xtt_145" 200tez 200000000n 200000000n 0.001tez

let test_xtz_to_token_146 = test_quote_accuracy "xtt_146" 200tez 200000000n 200000000n 0.005tez

let test_xtz_to_token_147 = test_quote_accuracy "xtt_147" 200tez 200000000n 200000000n 0.01tez

let test_xtz_to_token_148 = test_quote_accuracy "xtt_148" 200tez 200000000n 200000000n 0.05tez

let test_xtz_to_token_149 = test_quote_accuracy "xtt_149" 500tez 500000000n 500000000n 0.001tez

let test_xtz_to_token_150 = test_quote_accuracy "xtt_150" 500tez 500000000n 500000000n 0.005tez

let test_xtz_to_token_151 = test_quote_accuracy "xtt_151" 500tez 500000000n 500000000n 0.01tez

let test_xtz_to_token_152 = test_quote_accuracy "xtt_152" 500tez 500000000n 500000000n 0.05tez

let test_xtz_to_token_153 = test_quote_accuracy "xtt_153" 1000tez 1000000000n 1000000000n 0.001tez

let test_xtz_to_token_154 = test_quote_accuracy "xtt_154" 1000tez 1000000000n 1000000000n 0.005tez

let test_xtz_to_token_155 = test_quote_accuracy "xtt_155" 1000tez 1000000000n 1000000000n 0.01tez

let test_xtz_to_token_156 = test_quote_accuracy "xtt_156" 1000tez 1000000000n 1000000000n 0.05tez

let test_xtz_to_token_157 = test_quote_accuracy "xtt_157" 50tez 50000000n 50000000n 0.001tez

let test_xtz_to_token_158 = test_quote_accuracy "xtt_158" 50tez 50000000n 50000000n 0.002tez

let test_xtz_to_token_159 = test_quote_accuracy "xtt_159" 50tez 50000000n 50000000n 0.003tez

let test_xtz_to_token_160 = test_quote_accuracy "xtt_160" 50tez 50000000n 50000000n 0.004tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Extreme Imbalances                            *)
(*****************************************************************************)
let test_xtz_to_token_161 = test_quote_accuracy "xtt_161" 1000tez 100000n 5000000n 10tez

let test_xtz_to_token_162 = test_quote_accuracy "xtt_162" 1000tez 200000n 5000000n 20tez

let test_xtz_to_token_163 = test_quote_accuracy "xtt_163" 1000tez 500000n 5000000n 50tez

let test_xtz_to_token_164 = test_quote_accuracy "xtt_164" 100tez 10000000n 5000000n 1tez

let test_xtz_to_token_165 = test_quote_accuracy "xtt_165" 100tez 20000000n 5000000n 2tez

let test_xtz_to_token_166 = test_quote_accuracy "xtt_166" 100tez 50000000n 5000000n 5tez

let test_xtz_to_token_167 = test_quote_accuracy "xtt_167" 10tez 100000000n 10000000n 1tez

let test_xtz_to_token_168 = test_quote_accuracy "xtt_168" 10tez 200000000n 10000000n 2tez

let test_xtz_to_token_169 = test_quote_accuracy "xtt_169" 10tez 500000000n 10000000n 5tez

let test_xtz_to_token_170 = test_quote_accuracy "xtt_170" 1tez 10000000n 1000000n 0.1tez

let test_xtz_to_token_171 = test_quote_accuracy "xtt_171" 1tez 20000000n 1000000n 0.2tez

let test_xtz_to_token_172 = test_quote_accuracy "xtt_172" 1tez 50000000n 1000000n 0.5tez

let test_xtz_to_token_173 = test_quote_accuracy "xtt_173" 500tez 50000n 2500000n 5tez

let test_xtz_to_token_174 = test_quote_accuracy "xtt_174" 500tez 25000n 2500000n 2.5tez

let test_xtz_to_token_175 = test_quote_accuracy "xtt_175" 50tez 5000000n 2500000n 0.5tez

let test_xtz_to_token_176 = test_quote_accuracy "xtt_176" 50tez 10000000n 2500000n 1tez

let test_xtz_to_token_177 = test_quote_accuracy "xtt_177" 5tez 50000000n 2500000n 0.5tez

let test_xtz_to_token_178 = test_quote_accuracy "xtt_178" 5tez 100000000n 2500000n 1tez

let test_xtz_to_token_179 = test_quote_accuracy "xtt_179" 2000tez 1000000n 10000000n 20tez

let test_xtz_to_token_180 = test_quote_accuracy "xtt_180" 200tez 10000000n 10000000n 2tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Odd Numbers and Edge Cases                    *)
(*****************************************************************************)
let test_xtz_to_token_181 = test_quote_accuracy "xtt_181" 1.111tez 1111111n 1111111n 0.111tez

let test_xtz_to_token_182 = test_quote_accuracy "xtt_182" 2.222tez 2222222n 2222222n 0.222tez

let test_xtz_to_token_183 = test_quote_accuracy "xtt_183" 3.333tez 3333333n 3333333n 0.333tez

let test_xtz_to_token_184 = test_quote_accuracy "xtt_184" 4.444tez 4444444n 4444444n 0.444tez

let test_xtz_to_token_185 = test_quote_accuracy "xtt_185" 5.555tez 5555555n 5555555n 0.555tez

let test_xtz_to_token_186 = test_quote_accuracy "xtt_186" 6.666tez 6666666n 6666666n 0.666tez

let test_xtz_to_token_187 = test_quote_accuracy "xtt_187" 7.777tez 7777777n 7777777n 0.777tez

let test_xtz_to_token_188 = test_quote_accuracy "xtt_188" 8.888tez 8888888n 8888888n 0.888tez

let test_xtz_to_token_189 = test_quote_accuracy "xtt_189" 9.999tez 9999999n 9999999n 0.999tez

let test_xtz_to_token_190 = test_quote_accuracy "xtt_190" 1.234tez 1234567n 1234567n 0.123tez

let test_xtz_to_token_191 = test_quote_accuracy "xtt_191" 2.345tez 2345678n 2345678n 0.234tez

let test_xtz_to_token_192 = test_quote_accuracy "xtt_192" 3.456tez 3456789n 3456789n 0.345tez

let test_xtz_to_token_193 = test_quote_accuracy "xtt_193" 4.567tez 4567890n 4567890n 0.456tez

let test_xtz_to_token_194 = test_quote_accuracy "xtt_194" 5.678tez 5678901n 5678901n 0.567tez

let test_xtz_to_token_195 = test_quote_accuracy "xtt_195" 6.789tez 6789012n 6789012n 0.678tez

let test_xtz_to_token_196 = test_quote_accuracy "xtt_196" 7.89tez 7890123n 7890123n 0.789tez

let test_xtz_to_token_197 = test_quote_accuracy "xtt_197" 0.123tez 123456n 123456n 0.012tez

let test_xtz_to_token_198 = test_quote_accuracy "xtt_198" 0.456tez 456789n 456789n 0.045tez

let test_xtz_to_token_199 = test_quote_accuracy "xtt_199" 0.789tez 789012n 789012n 0.078tez

let test_xtz_to_token_200 = test_quote_accuracy "xtt_200" 1.357tez 1357924n 1357924n 0.135tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Various Ratios (Batch 201-300)                *)
(*****************************************************************************)
let test_xtz_to_token_201 = test_quote_accuracy "xtt_201" 11tez 11000000n 11000000n 1.1tez

let test_xtz_to_token_202 = test_quote_accuracy "xtt_202" 13tez 13000000n 13000000n 1.3tez

let test_xtz_to_token_203 = test_quote_accuracy "xtt_203" 17tez 17000000n 17000000n 1.7tez

let test_xtz_to_token_204 = test_quote_accuracy "xtt_204" 19tez 19000000n 19000000n 1.9tez

let test_xtz_to_token_205 = test_quote_accuracy "xtt_205" 23tez 23000000n 23000000n 2.3tez

let test_xtz_to_token_206 = test_quote_accuracy "xtt_206" 29tez 29000000n 29000000n 2.9tez

let test_xtz_to_token_207 = test_quote_accuracy "xtt_207" 31tez 31000000n 31000000n 3.1tez

let test_xtz_to_token_208 = test_quote_accuracy "xtt_208" 37tez 37000000n 37000000n 3.7tez

let test_xtz_to_token_209 = test_quote_accuracy "xtt_209" 41tez 41000000n 41000000n 4.1tez

let test_xtz_to_token_210 = test_quote_accuracy "xtt_210" 43tez 43000000n 43000000n 4.3tez

let test_xtz_to_token_211 = test_quote_accuracy "xtt_211" 47tez 47000000n 47000000n 4.7tez

let test_xtz_to_token_212 = test_quote_accuracy "xtt_212" 53tez 53000000n 53000000n 5.3tez

let test_xtz_to_token_213 = test_quote_accuracy "xtt_213" 59tez 59000000n 59000000n 5.9tez

let test_xtz_to_token_214 = test_quote_accuracy "xtt_214" 61tez 61000000n 61000000n 6.1tez

let test_xtz_to_token_215 = test_quote_accuracy "xtt_215" 67tez 67000000n 67000000n 6.7tez

let test_xtz_to_token_216 = test_quote_accuracy "xtt_216" 71tez 71000000n 71000000n 7.1tez

let test_xtz_to_token_217 = test_quote_accuracy "xtt_217" 73tez 73000000n 73000000n 7.3tez

let test_xtz_to_token_218 = test_quote_accuracy "xtt_218" 79tez 79000000n 79000000n 7.9tez

let test_xtz_to_token_219 = test_quote_accuracy "xtt_219" 83tez 83000000n 83000000n 8.3tez

let test_xtz_to_token_220 = test_quote_accuracy "xtt_220" 89tez 89000000n 89000000n 8.9tez

let test_xtz_to_token_221 = test_quote_accuracy "xtt_221" 97tez 97000000n 97000000n 9.7tez

let test_xtz_to_token_222 = test_quote_accuracy "xtt_222" 110tez 110000000n 110000000n 11tez

let test_xtz_to_token_223 = test_quote_accuracy "xtt_223" 130tez 130000000n 130000000n 13tez

let test_xtz_to_token_224 = test_quote_accuracy "xtt_224" 170tez 170000000n 170000000n 17tez

let test_xtz_to_token_225 = test_quote_accuracy "xtt_225" 190tez 190000000n 190000000n 19tez

let test_xtz_to_token_226 = test_quote_accuracy "xtt_226" 210tez 210000000n 210000000n 21tez

let test_xtz_to_token_227 = test_quote_accuracy "xtt_227" 230tez 230000000n 230000000n 23tez

let test_xtz_to_token_228 = test_quote_accuracy "xtt_228" 270tez 270000000n 270000000n 27tez

let test_xtz_to_token_229 = test_quote_accuracy "xtt_229" 290tez 290000000n 290000000n 29tez

let test_xtz_to_token_230 = test_quote_accuracy "xtt_230" 310tez 310000000n 310000000n 31tez

let test_xtz_to_token_231 = test_quote_accuracy "xtt_231" 330tez 330000000n 330000000n 33tez

let test_xtz_to_token_232 = test_quote_accuracy "xtt_232" 370tez 370000000n 370000000n 37tez

let test_xtz_to_token_233 = test_quote_accuracy "xtt_233" 390tez 390000000n 390000000n 39tez

let test_xtz_to_token_234 = test_quote_accuracy "xtt_234" 410tez 410000000n 410000000n 41tez

let test_xtz_to_token_235 = test_quote_accuracy "xtt_235" 430tez 430000000n 430000000n 43tez

let test_xtz_to_token_236 = test_quote_accuracy "xtt_236" 470tez 470000000n 470000000n 47tez

let test_xtz_to_token_237 = test_quote_accuracy "xtt_237" 490tez 490000000n 490000000n 49tez

let test_xtz_to_token_238 = test_quote_accuracy "xtt_238" 510tez 510000000n 510000000n 51tez

let test_xtz_to_token_239 = test_quote_accuracy "xtt_239" 530tez 530000000n 530000000n 53tez

let test_xtz_to_token_240 = test_quote_accuracy "xtt_240" 570tez 570000000n 570000000n 57tez

let test_xtz_to_token_241 = test_quote_accuracy "xtt_241" 590tez 590000000n 590000000n 59tez

let test_xtz_to_token_242 = test_quote_accuracy "xtt_242" 610tez 610000000n 610000000n 61tez

let test_xtz_to_token_243 = test_quote_accuracy "xtt_243" 630tez 630000000n 630000000n 63tez

let test_xtz_to_token_244 = test_quote_accuracy "xtt_244" 670tez 670000000n 670000000n 67tez

let test_xtz_to_token_245 = test_quote_accuracy "xtt_245" 690tez 690000000n 690000000n 69tez

let test_xtz_to_token_246 = test_quote_accuracy "xtt_246" 710tez 710000000n 710000000n 71tez

let test_xtz_to_token_247 = test_quote_accuracy "xtt_247" 730tez 730000000n 730000000n 73tez

let test_xtz_to_token_248 = test_quote_accuracy "xtt_248" 770tez 770000000n 770000000n 77tez

let test_xtz_to_token_249 = test_quote_accuracy "xtt_249" 790tez 790000000n 790000000n 79tez

let test_xtz_to_token_250 = test_quote_accuracy "xtt_250" 810tez 810000000n 810000000n 81tez

let test_xtz_to_token_251 = test_quote_accuracy "xtt_251" 830tez 830000000n 830000000n 83tez

let test_xtz_to_token_252 = test_quote_accuracy "xtt_252" 870tez 870000000n 870000000n 87tez

let test_xtz_to_token_253 = test_quote_accuracy "xtt_253" 890tez 890000000n 890000000n 89tez

let test_xtz_to_token_254 = test_quote_accuracy "xtt_254" 910tez 910000000n 910000000n 91tez

let test_xtz_to_token_255 = test_quote_accuracy "xtt_255" 930tez 930000000n 930000000n 93tez

let test_xtz_to_token_256 = test_quote_accuracy "xtt_256" 970tez 970000000n 970000000n 97tez

let test_xtz_to_token_257 = test_quote_accuracy "xtt_257" 14tez 14000000n 14000000n 1.4tez

let test_xtz_to_token_258 = test_quote_accuracy "xtt_258" 16tez 16000000n 16000000n 1.6tez

let test_xtz_to_token_259 = test_quote_accuracy "xtt_259" 21tez 21000000n 21000000n 2.1tez

let test_xtz_to_token_260 = test_quote_accuracy "xtt_260" 24tez 24000000n 24000000n 2.4tez

let test_xtz_to_token_261 = test_quote_accuracy "xtt_261" 26tez 26000000n 26000000n 2.6tez

let test_xtz_to_token_262 = test_quote_accuracy "xtt_262" 27tez 27000000n 27000000n 2.7tez

let test_xtz_to_token_263 = test_quote_accuracy "xtt_263" 32tez 32000000n 32000000n 3.2tez

let test_xtz_to_token_264 = test_quote_accuracy "xtt_264" 33tez 33000000n 33000000n 3.3tez

let test_xtz_to_token_265 = test_quote_accuracy "xtt_265" 34tez 34000000n 34000000n 3.4tez

let test_xtz_to_token_266 = test_quote_accuracy "xtt_266" 36tez 36000000n 36000000n 3.6tez

let test_xtz_to_token_267 = test_quote_accuracy "xtt_267" 38tez 38000000n 38000000n 3.8tez

let test_xtz_to_token_268 = test_quote_accuracy "xtt_268" 39tez 39000000n 39000000n 3.9tez

let test_xtz_to_token_269 = test_quote_accuracy "xtt_269" 42tez 42000000n 42000000n 4.2tez

let test_xtz_to_token_270 = test_quote_accuracy "xtt_270" 44tez 44000000n 44000000n 4.4tez

let test_xtz_to_token_271 = test_quote_accuracy "xtt_271" 46tez 46000000n 46000000n 4.6tez

let test_xtz_to_token_272 = test_quote_accuracy "xtt_272" 48tez 48000000n 48000000n 4.8tez

let test_xtz_to_token_273 = test_quote_accuracy "xtt_273" 49tez 49000000n 49000000n 4.9tez

let test_xtz_to_token_274 = test_quote_accuracy "xtt_274" 51tez 51000000n 51000000n 5.1tez

let test_xtz_to_token_275 = test_quote_accuracy "xtt_275" 52tez 52000000n 52000000n 5.2tez

let test_xtz_to_token_276 = test_quote_accuracy "xtt_276" 54tez 54000000n 54000000n 5.4tez

let test_xtz_to_token_277 = test_quote_accuracy "xtt_277" 56tez 56000000n 56000000n 5.6tez

let test_xtz_to_token_278 = test_quote_accuracy "xtt_278" 57tez 57000000n 57000000n 5.7tez

let test_xtz_to_token_279 = test_quote_accuracy "xtt_279" 58tez 58000000n 58000000n 5.8tez

let test_xtz_to_token_280 = test_quote_accuracy "xtt_280" 62tez 62000000n 62000000n 6.2tez

let test_xtz_to_token_281 = test_quote_accuracy "xtt_281" 63tez 63000000n 63000000n 6.3tez

let test_xtz_to_token_282 = test_quote_accuracy "xtt_282" 64tez 64000000n 64000000n 6.4tez

let test_xtz_to_token_283 = test_quote_accuracy "xtt_283" 66tez 66000000n 66000000n 6.6tez

let test_xtz_to_token_284 = test_quote_accuracy "xtt_284" 68tez 68000000n 68000000n 6.8tez

let test_xtz_to_token_285 = test_quote_accuracy "xtt_285" 69tez 69000000n 69000000n 6.9tez

let test_xtz_to_token_286 = test_quote_accuracy "xtt_286" 72tez 72000000n 72000000n 7.2tez

let test_xtz_to_token_287 = test_quote_accuracy "xtt_287" 74tez 74000000n 74000000n 7.4tez

let test_xtz_to_token_288 = test_quote_accuracy "xtt_288" 76tez 76000000n 76000000n 7.6tez

let test_xtz_to_token_289 = test_quote_accuracy "xtt_289" 77tez 77000000n 77000000n 7.7tez

let test_xtz_to_token_290 = test_quote_accuracy "xtt_290" 78tez 78000000n 78000000n 7.8tez

let test_xtz_to_token_291 = test_quote_accuracy "xtt_291" 81tez 81000000n 81000000n 8.1tez

let test_xtz_to_token_292 = test_quote_accuracy "xtt_292" 82tez 82000000n 82000000n 8.2tez

let test_xtz_to_token_293 = test_quote_accuracy "xtt_293" 84tez 84000000n 84000000n 8.4tez

let test_xtz_to_token_294 = test_quote_accuracy "xtt_294" 86tez 86000000n 86000000n 8.6tez

let test_xtz_to_token_295 = test_quote_accuracy "xtt_295" 87tez 87000000n 87000000n 8.7tez

let test_xtz_to_token_296 = test_quote_accuracy "xtt_296" 88tez 88000000n 88000000n 8.8tez

let test_xtz_to_token_297 = test_quote_accuracy "xtt_297" 91tez 91000000n 91000000n 9.1tez

let test_xtz_to_token_298 = test_quote_accuracy "xtt_298" 92tez 92000000n 92000000n 9.2tez

let test_xtz_to_token_299 = test_quote_accuracy "xtt_299" 93tez 93000000n 93000000n 9.3tez

let test_xtz_to_token_300 = test_quote_accuracy "xtt_300" 94tez 94000000n 94000000n 9.4tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Mixed Scenarios (Batch 301-400)               *)
(*****************************************************************************)
let test_xtz_to_token_301 = test_quote_accuracy "xtt_301" 11tez 5500000n 11000000n 1.1tez

let test_xtz_to_token_302 = test_quote_accuracy "xtt_302" 13tez 6500000n 13000000n 1.3tez

let test_xtz_to_token_303 = test_quote_accuracy "xtt_303" 17tez 8500000n 17000000n 1.7tez

let test_xtz_to_token_304 = test_quote_accuracy "xtt_304" 19tez 9500000n 19000000n 1.9tez

let test_xtz_to_token_305 = test_quote_accuracy "xtt_305" 11tez 22000000n 11000000n 1.1tez

let test_xtz_to_token_306 = test_quote_accuracy "xtt_306" 13tez 26000000n 13000000n 1.3tez

let test_xtz_to_token_307 = test_quote_accuracy "xtt_307" 17tez 34000000n 17000000n 1.7tez

let test_xtz_to_token_308 = test_quote_accuracy "xtt_308" 19tez 38000000n 19000000n 1.9tez

let test_xtz_to_token_309 = test_quote_accuracy "xtt_309" 111tez 111000000n 111000000n 11.1tez

let test_xtz_to_token_310 = test_quote_accuracy "xtt_310" 222tez 222000000n 222000000n 22.2tez

let test_xtz_to_token_311 = test_quote_accuracy "xtt_311" 333tez 333000000n 333000000n 33.3tez

let test_xtz_to_token_312 = test_quote_accuracy "xtt_312" 444tez 444000000n 444000000n 44.4tez

let test_xtz_to_token_313 = test_quote_accuracy "xtt_313" 555tez 555000000n 555000000n 55.5tez

let test_xtz_to_token_314 = test_quote_accuracy "xtt_314" 666tez 666000000n 666000000n 66.6tez

let test_xtz_to_token_315 = test_quote_accuracy "xtt_315" 777tez 777000000n 777000000n 77.7tez

let test_xtz_to_token_316 = test_quote_accuracy "xtt_316" 888tez 888000000n 888000000n 88.8tez

let test_xtz_to_token_317 = test_quote_accuracy "xtt_317" 999tez 999000000n 999000000n 99.9tez

let test_xtz_to_token_318 = test_quote_accuracy "xtt_318" 123tez 123000000n 123000000n 12.3tez

let test_xtz_to_token_319 = test_quote_accuracy "xtt_319" 234tez 234000000n 234000000n 23.4tez

let test_xtz_to_token_320 = test_quote_accuracy "xtt_320" 345tez 345000000n 345000000n 34.5tez

let test_xtz_to_token_321 = test_quote_accuracy "xtt_321" 456tez 456000000n 456000000n 45.6tez

let test_xtz_to_token_322 = test_quote_accuracy "xtt_322" 567tez 567000000n 567000000n 56.7tez

let test_xtz_to_token_323 = test_quote_accuracy "xtt_323" 678tez 678000000n 678000000n 67.8tez

let test_xtz_to_token_324 = test_quote_accuracy "xtt_324" 789tez 789000000n 789000000n 78.9tez

let test_xtz_to_token_325 = test_quote_accuracy "xtt_325" 135tez 135000000n 135000000n 13.5tez

let test_xtz_to_token_326 = test_quote_accuracy "xtt_326" 246tez 246000000n 246000000n 24.6tez

let test_xtz_to_token_327 = test_quote_accuracy "xtt_327" 357tez 357000000n 357000000n 35.7tez

let test_xtz_to_token_328 = test_quote_accuracy "xtt_328" 468tez 468000000n 468000000n 46.8tez

let test_xtz_to_token_329 = test_quote_accuracy "xtt_329" 579tez 579000000n 579000000n 57.9tez

let test_xtz_to_token_330 = test_quote_accuracy "xtt_330" 12tez 6000000n 12000000n 1.2tez

let test_xtz_to_token_331 = test_quote_accuracy "xtt_331" 24tez 12000000n 24000000n 2.4tez

let test_xtz_to_token_332 = test_quote_accuracy "xtt_332" 36tez 18000000n 36000000n 3.6tez

let test_xtz_to_token_333 = test_quote_accuracy "xtt_333" 48tez 24000000n 48000000n 4.8tez

let test_xtz_to_token_334 = test_quote_accuracy "xtt_334" 12tez 24000000n 12000000n 1.2tez

let test_xtz_to_token_335 = test_quote_accuracy "xtt_335" 24tez 48000000n 24000000n 2.4tez

let test_xtz_to_token_336 = test_quote_accuracy "xtt_336" 36tez 72000000n 36000000n 3.6tez

let test_xtz_to_token_337 = test_quote_accuracy "xtt_337" 48tez 96000000n 48000000n 4.8tez

let test_xtz_to_token_338 = test_quote_accuracy "xtt_338" 0.2tez 250000n 250000n 0.02tez

let test_xtz_to_token_339 = test_quote_accuracy "xtt_339" 0.5tez 500000n 500000n 0.05tez

let test_xtz_to_token_340 = test_quote_accuracy "xtt_340" 0.6tez 750000n 750000n 0.06tez

let test_xtz_to_token_341 = test_quote_accuracy "xtt_341" 1tez 1250000n 1250000n 0.1tez

let test_xtz_to_token_342 = test_quote_accuracy "xtt_342" 1.4tez 1750000n 1750000n 0.14tez

let test_xtz_to_token_343 = test_quote_accuracy "xtt_343" 1.8tez 2250000n 2250000n 0.18tez

let test_xtz_to_token_344 = test_quote_accuracy "xtt_344" 2.2tez 2750000n 2750000n 0.22tez

let test_xtz_to_token_345 = test_quote_accuracy "xtt_345" 2.6tez 3250000n 3250000n 0.26tez

let test_xtz_to_token_346 = test_quote_accuracy "xtt_346" 3tez 3750000n 3750000n 0.3tez

let test_xtz_to_token_347 = test_quote_accuracy "xtt_347" 3.4tez 4250000n 4250000n 0.34tez

let test_xtz_to_token_348 = test_quote_accuracy "xtt_348" 3.8tez 4750000n 4750000n 0.38tez

let test_xtz_to_token_349 = test_quote_accuracy "xtt_349" 4.2tez 5250000n 5250000n 0.42tez

let test_xtz_to_token_350 = test_quote_accuracy "xtt_350" 4.6tez 5750000n 5750000n 0.46tez

let test_xtz_to_token_351 = test_quote_accuracy "xtt_351" 5tez 6250000n 6250000n 0.5tez

let test_xtz_to_token_352 = test_quote_accuracy "xtt_352" 5.4tez 6750000n 6750000n 0.54tez

let test_xtz_to_token_353 = test_quote_accuracy "xtt_353" 5.8tez 7250000n 7250000n 0.58tez

let test_xtz_to_token_354 = test_quote_accuracy "xtt_354" 6.2tez 7750000n 7750000n 0.62tez

let test_xtz_to_token_355 = test_quote_accuracy "xtt_355" 6.6tez 8250000n 8250000n 0.66tez

let test_xtz_to_token_356 = test_quote_accuracy "xtt_356" 7tez 8750000n 8750000n 0.7tez

let test_xtz_to_token_357 = test_quote_accuracy "xtt_357" 7.4tez 9250000n 9250000n 0.74tez

let test_xtz_to_token_358 = test_quote_accuracy "xtt_358" 7.8tez 9750000n 9750000n 0.78tez

let test_xtz_to_token_359 = test_quote_accuracy "xtt_359" 125tez 125000000n 125000000n 12.5tez

let test_xtz_to_token_360 = test_quote_accuracy "xtt_360" 175tez 175000000n 175000000n 17.5tez

let test_xtz_to_token_361 = test_quote_accuracy "xtt_361" 225tez 225000000n 225000000n 22.5tez

let test_xtz_to_token_362 = test_quote_accuracy "xtt_362" 275tez 275000000n 275000000n 27.5tez

let test_xtz_to_token_363 = test_quote_accuracy "xtt_363" 325tez 325000000n 325000000n 32.5tez

let test_xtz_to_token_364 = test_quote_accuracy "xtt_364" 375tez 375000000n 375000000n 37.5tez

let test_xtz_to_token_365 = test_quote_accuracy "xtt_365" 425tez 425000000n 425000000n 42.5tez

let test_xtz_to_token_366 = test_quote_accuracy "xtt_366" 475tez 475000000n 475000000n 47.5tez

let test_xtz_to_token_367 = test_quote_accuracy "xtt_367" 525tez 525000000n 525000000n 52.5tez

let test_xtz_to_token_368 = test_quote_accuracy "xtt_368" 575tez 575000000n 575000000n 57.5tez

let test_xtz_to_token_369 = test_quote_accuracy "xtt_369" 625tez 625000000n 625000000n 62.5tez

let test_xtz_to_token_370 = test_quote_accuracy "xtt_370" 675tez 675000000n 675000000n 67.5tez

let test_xtz_to_token_371 = test_quote_accuracy "xtt_371" 725tez 725000000n 725000000n 72.5tez

let test_xtz_to_token_372 = test_quote_accuracy "xtt_372" 775tez 775000000n 775000000n 77.5tez

let test_xtz_to_token_373 = test_quote_accuracy "xtt_373" 825tez 825000000n 825000000n 82.5tez

let test_xtz_to_token_374 = test_quote_accuracy "xtt_374" 875tez 875000000n 875000000n 87.5tez

let test_xtz_to_token_375 = test_quote_accuracy "xtt_375" 925tez 925000000n 925000000n 92.5tez

let test_xtz_to_token_376 = test_quote_accuracy "xtt_376" 975tez 975000000n 975000000n 97.5tez

let test_xtz_to_token_377 = test_quote_accuracy "xtt_377" 1250tez 1250000000n 1250000000n 125tez

let test_xtz_to_token_378 = test_quote_accuracy "xtt_378" 1750tez 1750000000n 1750000000n 175tez

let test_xtz_to_token_379 = test_quote_accuracy "xtt_379" 2250tez 2250000000n 2250000000n 225tez

let test_xtz_to_token_380 = test_quote_accuracy "xtt_380" 2750tez 2750000000n 2750000000n 275tez

let test_xtz_to_token_381 = test_quote_accuracy "xtt_381" 3250tez 3250000000n 3250000000n 325tez

let test_xtz_to_token_382 = test_quote_accuracy "xtt_382" 3750tez 3750000000n 3750000000n 375tez

let test_xtz_to_token_383 = test_quote_accuracy "xtt_383" 4250tez 4250000000n 4250000000n 425tez

let test_xtz_to_token_384 = test_quote_accuracy "xtt_384" 4750tez 4750000000n 4750000000n 475tez

let test_xtz_to_token_385 = test_quote_accuracy "xtt_385" 101tez 101000000n 101000000n 10.1tez

let test_xtz_to_token_386 = test_quote_accuracy "xtt_386" 103tez 103000000n 103000000n 10.3tez

let test_xtz_to_token_387 = test_quote_accuracy "xtt_387" 107tez 107000000n 107000000n 10.7tez

let test_xtz_to_token_388 = test_quote_accuracy "xtt_388" 109tez 109000000n 109000000n 10.9tez

let test_xtz_to_token_389 = test_quote_accuracy "xtt_389" 113tez 113000000n 113000000n 11.3tez

let test_xtz_to_token_390 = test_quote_accuracy "xtt_390" 127tez 127000000n 127000000n 12.7tez

let test_xtz_to_token_391 = test_quote_accuracy "xtt_391" 131tez 131000000n 131000000n 13.1tez

let test_xtz_to_token_392 = test_quote_accuracy "xtt_392" 137tez 137000000n 137000000n 13.7tez

let test_xtz_to_token_393 = test_quote_accuracy "xtt_393" 139tez 139000000n 139000000n 13.9tez

let test_xtz_to_token_394 = test_quote_accuracy "xtt_394" 149tez 149000000n 149000000n 14.9tez

let test_xtz_to_token_395 = test_quote_accuracy "xtt_395" 151tez 151000000n 151000000n 15.1tez

let test_xtz_to_token_396 = test_quote_accuracy "xtt_396" 157tez 157000000n 157000000n 15.7tez

let test_xtz_to_token_397 = test_quote_accuracy "xtt_397" 163tez 163000000n 163000000n 16.3tez

let test_xtz_to_token_398 = test_quote_accuracy "xtt_398" 167tez 167000000n 167000000n 16.7tez

let test_xtz_to_token_399 = test_quote_accuracy "xtt_399" 173tez 173000000n 173000000n 17.3tez

let test_xtz_to_token_400 = test_quote_accuracy "xtt_400" 179tez 179000000n 179000000n 17.9tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - More Variations (Batch 401-500)               *)
(*****************************************************************************)
let test_xtz_to_token_401 = test_quote_accuracy "xtt_401" 181tez 181000000n 181000000n 18.1tez

let test_xtz_to_token_402 = test_quote_accuracy "xtt_402" 191tez 191000000n 191000000n 19.1tez

let test_xtz_to_token_403 = test_quote_accuracy "xtt_403" 193tez 193000000n 193000000n 19.3tez

let test_xtz_to_token_404 = test_quote_accuracy "xtt_404" 197tez 197000000n 197000000n 19.7tez

let test_xtz_to_token_405 = test_quote_accuracy "xtt_405" 199tez 199000000n 199000000n 19.9tez

let test_xtz_to_token_406 = test_quote_accuracy "xtt_406" 211tez 211000000n 211000000n 21.1tez

let test_xtz_to_token_407 = test_quote_accuracy "xtt_407" 223tez 223000000n 223000000n 22.3tez

let test_xtz_to_token_408 = test_quote_accuracy "xtt_408" 227tez 227000000n 227000000n 22.7tez

let test_xtz_to_token_409 = test_quote_accuracy "xtt_409" 229tez 229000000n 229000000n 22.9tez

let test_xtz_to_token_410 = test_quote_accuracy "xtt_410" 233tez 233000000n 233000000n 23.3tez

let test_xtz_to_token_411 = test_quote_accuracy "xtt_411" 239tez 239000000n 239000000n 23.9tez

let test_xtz_to_token_412 = test_quote_accuracy "xtt_412" 241tez 241000000n 241000000n 24.1tez

let test_xtz_to_token_413 = test_quote_accuracy "xtt_413" 251tez 251000000n 251000000n 25.1tez

let test_xtz_to_token_414 = test_quote_accuracy "xtt_414" 257tez 257000000n 257000000n 25.7tez

let test_xtz_to_token_415 = test_quote_accuracy "xtt_415" 263tez 263000000n 263000000n 26.3tez

let test_xtz_to_token_416 = test_quote_accuracy "xtt_416" 269tez 269000000n 269000000n 26.9tez

let test_xtz_to_token_417 = test_quote_accuracy "xtt_417" 271tez 271000000n 271000000n 27.1tez

let test_xtz_to_token_418 = test_quote_accuracy "xtt_418" 277tez 277000000n 277000000n 27.7tez

let test_xtz_to_token_419 = test_quote_accuracy "xtt_419" 281tez 281000000n 281000000n 28.1tez

let test_xtz_to_token_420 = test_quote_accuracy "xtt_420" 283tez 283000000n 283000000n 28.3tez

let test_xtz_to_token_421 = test_quote_accuracy "xtt_421" 293tez 293000000n 293000000n 29.3tez

let test_xtz_to_token_422 = test_quote_accuracy "xtt_422" 307tez 307000000n 307000000n 30.7tez

let test_xtz_to_token_423 = test_quote_accuracy "xtt_423" 311tez 311000000n 311000000n 31.1tez

let test_xtz_to_token_424 = test_quote_accuracy "xtt_424" 313tez 313000000n 313000000n 31.3tez

let test_xtz_to_token_425 = test_quote_accuracy "xtt_425" 317tez 317000000n 317000000n 31.7tez

let test_xtz_to_token_426 = test_quote_accuracy "xtt_426" 331tez 331000000n 331000000n 33.1tez

let test_xtz_to_token_427 = test_quote_accuracy "xtt_427" 337tez 337000000n 337000000n 33.7tez

let test_xtz_to_token_428 = test_quote_accuracy "xtt_428" 347tez 347000000n 347000000n 34.7tez

let test_xtz_to_token_429 = test_quote_accuracy "xtt_429" 349tez 349000000n 349000000n 34.9tez

let test_xtz_to_token_430 = test_quote_accuracy "xtt_430" 353tez 353000000n 353000000n 35.3tez

let test_xtz_to_token_431 = test_quote_accuracy "xtt_431" 359tez 359000000n 359000000n 35.9tez

let test_xtz_to_token_432 = test_quote_accuracy "xtt_432" 367tez 367000000n 367000000n 36.7tez

let test_xtz_to_token_433 = test_quote_accuracy "xtt_433" 373tez 373000000n 373000000n 37.3tez

let test_xtz_to_token_434 = test_quote_accuracy "xtt_434" 379tez 379000000n 379000000n 37.9tez

let test_xtz_to_token_435 = test_quote_accuracy "xtt_435" 383tez 383000000n 383000000n 38.3tez

let test_xtz_to_token_436 = test_quote_accuracy "xtt_436" 389tez 389000000n 389000000n 38.9tez

let test_xtz_to_token_437 = test_quote_accuracy "xtt_437" 397tez 397000000n 397000000n 39.7tez

let test_xtz_to_token_438 = test_quote_accuracy "xtt_438" 401tez 401000000n 401000000n 40.1tez

let test_xtz_to_token_439 = test_quote_accuracy "xtt_439" 409tez 409000000n 409000000n 40.9tez

let test_xtz_to_token_440 = test_quote_accuracy "xtt_440" 419tez 419000000n 419000000n 41.9tez

let test_xtz_to_token_441 = test_quote_accuracy "xtt_441" 421tez 421000000n 421000000n 42.1tez

let test_xtz_to_token_442 = test_quote_accuracy "xtt_442" 431tez 431000000n 431000000n 43.1tez

let test_xtz_to_token_443 = test_quote_accuracy "xtt_443" 433tez 433000000n 433000000n 43.3tez

let test_xtz_to_token_444 = test_quote_accuracy "xtt_444" 439tez 439000000n 439000000n 43.9tez

let test_xtz_to_token_445 = test_quote_accuracy "xtt_445" 443tez 443000000n 443000000n 44.3tez

let test_xtz_to_token_446 = test_quote_accuracy "xtt_446" 449tez 449000000n 449000000n 44.9tez

let test_xtz_to_token_447 = test_quote_accuracy "xtt_447" 457tez 457000000n 457000000n 45.7tez

let test_xtz_to_token_448 = test_quote_accuracy "xtt_448" 461tez 461000000n 461000000n 46.1tez

let test_xtz_to_token_449 = test_quote_accuracy "xtt_449" 463tez 463000000n 463000000n 46.3tez

let test_xtz_to_token_450 = test_quote_accuracy "xtt_450" 467tez 467000000n 467000000n 46.7tez

let test_xtz_to_token_451 = test_quote_accuracy "xtt_451" 479tez 479000000n 479000000n 47.9tez

let test_xtz_to_token_452 = test_quote_accuracy "xtt_452" 487tez 487000000n 487000000n 48.7tez

let test_xtz_to_token_453 = test_quote_accuracy "xtt_453" 491tez 491000000n 491000000n 49.1tez

let test_xtz_to_token_454 = test_quote_accuracy "xtt_454" 499tez 499000000n 499000000n 49.9tez

let test_xtz_to_token_455 = test_quote_accuracy "xtt_455" 503tez 503000000n 503000000n 50.3tez

let test_xtz_to_token_456 = test_quote_accuracy "xtt_456" 509tez 509000000n 509000000n 50.9tez

let test_xtz_to_token_457 = test_quote_accuracy "xtt_457" 521tez 521000000n 521000000n 52.1tez

let test_xtz_to_token_458 = test_quote_accuracy "xtt_458" 523tez 523000000n 523000000n 52.3tez

let test_xtz_to_token_459 = test_quote_accuracy "xtt_459" 541tez 541000000n 541000000n 54.1tez

let test_xtz_to_token_460 = test_quote_accuracy "xtt_460" 547tez 547000000n 547000000n 54.7tez

let test_xtz_to_token_461 = test_quote_accuracy "xtt_461" 557tez 557000000n 557000000n 55.7tez

let test_xtz_to_token_462 = test_quote_accuracy "xtt_462" 563tez 563000000n 563000000n 56.3tez

let test_xtz_to_token_463 = test_quote_accuracy "xtt_463" 569tez 569000000n 569000000n 56.9tez

let test_xtz_to_token_464 = test_quote_accuracy "xtt_464" 571tez 571000000n 571000000n 57.1tez

let test_xtz_to_token_465 = test_quote_accuracy "xtt_465" 577tez 577000000n 577000000n 57.7tez

let test_xtz_to_token_466 = test_quote_accuracy "xtt_466" 587tez 587000000n 587000000n 58.7tez

let test_xtz_to_token_467 = test_quote_accuracy "xtt_467" 593tez 593000000n 593000000n 59.3tez

let test_xtz_to_token_468 = test_quote_accuracy "xtt_468" 599tez 599000000n 599000000n 59.9tez

let test_xtz_to_token_469 = test_quote_accuracy "xtt_469" 601tez 601000000n 601000000n 60.1tez

let test_xtz_to_token_470 = test_quote_accuracy "xtt_470" 607tez 607000000n 607000000n 60.7tez

let test_xtz_to_token_471 = test_quote_accuracy "xtt_471" 613tez 613000000n 613000000n 61.3tez

let test_xtz_to_token_472 = test_quote_accuracy "xtt_472" 617tez 617000000n 617000000n 61.7tez

let test_xtz_to_token_473 = test_quote_accuracy "xtt_473" 619tez 619000000n 619000000n 61.9tez

let test_xtz_to_token_474 = test_quote_accuracy "xtt_474" 631tez 631000000n 631000000n 63.1tez

let test_xtz_to_token_475 = test_quote_accuracy "xtt_475" 641tez 641000000n 641000000n 64.1tez

let test_xtz_to_token_476 = test_quote_accuracy "xtt_476" 643tez 643000000n 643000000n 64.3tez

let test_xtz_to_token_477 = test_quote_accuracy "xtt_477" 647tez 647000000n 647000000n 64.7tez

let test_xtz_to_token_478 = test_quote_accuracy "xtt_478" 653tez 653000000n 653000000n 65.3tez

let test_xtz_to_token_479 = test_quote_accuracy "xtt_479" 659tez 659000000n 659000000n 65.9tez

let test_xtz_to_token_480 = test_quote_accuracy "xtt_480" 661tez 661000000n 661000000n 66.1tez

let test_xtz_to_token_481 = test_quote_accuracy "xtt_481" 673tez 673000000n 673000000n 67.3tez

let test_xtz_to_token_482 = test_quote_accuracy "xtt_482" 677tez 677000000n 677000000n 67.7tez

let test_xtz_to_token_483 = test_quote_accuracy "xtt_483" 683tez 683000000n 683000000n 68.3tez

let test_xtz_to_token_484 = test_quote_accuracy "xtt_484" 691tez 691000000n 691000000n 69.1tez

let test_xtz_to_token_485 = test_quote_accuracy "xtt_485" 701tez 701000000n 701000000n 70.1tez

let test_xtz_to_token_486 = test_quote_accuracy "xtt_486" 709tez 709000000n 709000000n 70.9tez

let test_xtz_to_token_487 = test_quote_accuracy "xtt_487" 719tez 719000000n 719000000n 71.9tez

let test_xtz_to_token_488 = test_quote_accuracy "xtt_488" 727tez 727000000n 727000000n 72.7tez

let test_xtz_to_token_489 = test_quote_accuracy "xtt_489" 733tez 733000000n 733000000n 73.3tez

let test_xtz_to_token_490 = test_quote_accuracy "xtt_490" 739tez 739000000n 739000000n 73.9tez

let test_xtz_to_token_491 = test_quote_accuracy "xtt_491" 743tez 743000000n 743000000n 74.3tez

let test_xtz_to_token_492 = test_quote_accuracy "xtt_492" 751tez 751000000n 751000000n 75.1tez

let test_xtz_to_token_493 = test_quote_accuracy "xtt_493" 757tez 757000000n 757000000n 75.7tez

let test_xtz_to_token_494 = test_quote_accuracy "xtt_494" 761tez 761000000n 761000000n 76.1tez

let test_xtz_to_token_495 = test_quote_accuracy "xtt_495" 769tez 769000000n 769000000n 76.9tez

let test_xtz_to_token_496 = test_quote_accuracy "xtt_496" 773tez 773000000n 773000000n 77.3tez

let test_xtz_to_token_497 = test_quote_accuracy "xtt_497" 787tez 787000000n 787000000n 78.7tez

let test_xtz_to_token_498 = test_quote_accuracy "xtt_498" 797tez 797000000n 797000000n 79.7tez

let test_xtz_to_token_499 = test_quote_accuracy "xtt_499" 809tez 809000000n 809000000n 80.9tez

let test_xtz_to_token_500 = test_quote_accuracy "xtt_500" 811tez 811000000n 811000000n 81.1tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - Additional Tests (Batch 501-800)             *)
(*****************************************************************************)
let test_xtz_to_token_501 = test_quote_accuracy "xtt_501" 20tez 10000000n 20000000n 4tez

let test_xtz_to_token_502 = test_quote_accuracy "xtt_502" 30tez 60000000n 30000000n 3tez

let test_xtz_to_token_503 = test_quote_accuracy "xtt_503" 40tez 40000000n 40000000n 4tez

let test_xtz_to_token_504 = test_quote_accuracy "xtt_504" 50tez 25000000n 50000000n 5tez

let test_xtz_to_token_505 = test_quote_accuracy "xtt_505" 60tez 120000000n 60000000n 3tez

let test_xtz_to_token_506 = test_quote_accuracy "xtt_506" 70tez 70000000n 70000000n 14tez

let test_xtz_to_token_507 = test_quote_accuracy "xtt_507" 80tez 40000000n 80000000n 8tez

let test_xtz_to_token_508 = test_quote_accuracy "xtt_508" 90tez 180000000n 90000000n 9tez

let test_xtz_to_token_509 = test_quote_accuracy "xtt_509" 100tez 100000000n 100000000n 10tez

let test_xtz_to_token_510 = test_quote_accuracy "xtt_510" 110tez 55000000n 110000000n 5.5tez

let test_xtz_to_token_511 = test_quote_accuracy "xtt_511" 120tez 240000000n 120000000n 24tez

let test_xtz_to_token_512 = test_quote_accuracy "xtt_512" 130tez 130000000n 130000000n 13tez

let test_xtz_to_token_513 = test_quote_accuracy "xtt_513" 140tez 70000000n 140000000n 14tez

let test_xtz_to_token_514 = test_quote_accuracy "xtt_514" 150tez 300000000n 150000000n 15tez

let test_xtz_to_token_515 = test_quote_accuracy "xtt_515" 160tez 160000000n 160000000n 8tez

let test_xtz_to_token_516 = test_quote_accuracy "xtt_516" 170tez 85000000n 170000000n 34tez

let test_xtz_to_token_517 = test_quote_accuracy "xtt_517" 180tez 360000000n 180000000n 18tez

let test_xtz_to_token_518 = test_quote_accuracy "xtt_518" 190tez 190000000n 190000000n 19tez

let test_xtz_to_token_519 = test_quote_accuracy "xtt_519" 200tez 100000000n 200000000n 20tez

let test_xtz_to_token_520 = test_quote_accuracy "xtt_520" 210tez 420000000n 210000000n 10.5tez

let test_xtz_to_token_521 = test_quote_accuracy "xtt_521" 220tez 220000000n 220000000n 44tez

let test_xtz_to_token_522 = test_quote_accuracy "xtt_522" 230tez 115000000n 230000000n 23tez

let test_xtz_to_token_523 = test_quote_accuracy "xtt_523" 240tez 480000000n 240000000n 24tez

let test_xtz_to_token_524 = test_quote_accuracy "xtt_524" 250tez 250000000n 250000000n 25tez

let test_xtz_to_token_525 = test_quote_accuracy "xtt_525" 260tez 130000000n 260000000n 13tez

let test_xtz_to_token_526 = test_quote_accuracy "xtt_526" 270tez 540000000n 270000000n 54tez

let test_xtz_to_token_527 = test_quote_accuracy "xtt_527" 280tez 280000000n 280000000n 28tez

let test_xtz_to_token_528 = test_quote_accuracy "xtt_528" 290tez 145000000n 290000000n 29tez

let test_xtz_to_token_529 = test_quote_accuracy "xtt_529" 300tez 600000000n 300000000n 30tez

let test_xtz_to_token_530 = test_quote_accuracy "xtt_530" 310tez 310000000n 310000000n 15.5tez

let test_xtz_to_token_531 = test_quote_accuracy "xtt_531" 320tez 160000000n 320000000n 64tez

let test_xtz_to_token_532 = test_quote_accuracy "xtt_532" 330tez 660000000n 330000000n 33tez

let test_xtz_to_token_533 = test_quote_accuracy "xtt_533" 340tez 340000000n 340000000n 34tez

let test_xtz_to_token_534 = test_quote_accuracy "xtt_534" 350tez 175000000n 350000000n 35tez

let test_xtz_to_token_535 = test_quote_accuracy "xtt_535" 360tez 720000000n 360000000n 18tez

let test_xtz_to_token_536 = test_quote_accuracy "xtt_536" 370tez 370000000n 370000000n 74tez

let test_xtz_to_token_537 = test_quote_accuracy "xtt_537" 380tez 190000000n 380000000n 38tez

let test_xtz_to_token_538 = test_quote_accuracy "xtt_538" 390tez 780000000n 390000000n 39tez

let test_xtz_to_token_539 = test_quote_accuracy "xtt_539" 400tez 400000000n 400000000n 40tez

let test_xtz_to_token_540 = test_quote_accuracy "xtt_540" 410tez 205000000n 410000000n 20.5tez

let test_xtz_to_token_541 = test_quote_accuracy "xtt_541" 420tez 840000000n 420000000n 84tez

let test_xtz_to_token_542 = test_quote_accuracy "xtt_542" 430tez 430000000n 430000000n 43tez

let test_xtz_to_token_543 = test_quote_accuracy "xtt_543" 440tez 220000000n 440000000n 44tez

let test_xtz_to_token_544 = test_quote_accuracy "xtt_544" 450tez 900000000n 450000000n 45tez

let test_xtz_to_token_545 = test_quote_accuracy "xtt_545" 460tez 460000000n 460000000n 23tez

let test_xtz_to_token_546 = test_quote_accuracy "xtt_546" 470tez 235000000n 470000000n 94tez

let test_xtz_to_token_547 = test_quote_accuracy "xtt_547" 480tez 960000000n 480000000n 48tez

let test_xtz_to_token_548 = test_quote_accuracy "xtt_548" 490tez 490000000n 490000000n 49tez

let test_xtz_to_token_549 = test_quote_accuracy "xtt_549" 500tez 250000000n 500000000n 50tez

let test_xtz_to_token_550 = test_quote_accuracy "xtt_550" 510tez 1020000000n 510000000n 25.5tez

let test_xtz_to_token_551 = test_quote_accuracy "xtt_551" 520tez 520000000n 520000000n 104tez

let test_xtz_to_token_552 = test_quote_accuracy "xtt_552" 530tez 265000000n 530000000n 53tez

let test_xtz_to_token_553 = test_quote_accuracy "xtt_553" 540tez 1080000000n 540000000n 54tez

let test_xtz_to_token_554 = test_quote_accuracy "xtt_554" 550tez 550000000n 550000000n 55tez

let test_xtz_to_token_555 = test_quote_accuracy "xtt_555" 560tez 280000000n 560000000n 28tez

let test_xtz_to_token_556 = test_quote_accuracy "xtt_556" 570tez 1140000000n 570000000n 114tez

let test_xtz_to_token_557 = test_quote_accuracy "xtt_557" 580tez 580000000n 580000000n 58tez

let test_xtz_to_token_558 = test_quote_accuracy "xtt_558" 590tez 295000000n 590000000n 59tez

let test_xtz_to_token_559 = test_quote_accuracy "xtt_559" 600tez 1200000000n 600000000n 60tez

let test_xtz_to_token_560 = test_quote_accuracy "xtt_560" 610tez 610000000n 610000000n 30.5tez

let test_xtz_to_token_561 = test_quote_accuracy "xtt_561" 620tez 310000000n 620000000n 124tez

let test_xtz_to_token_562 = test_quote_accuracy "xtt_562" 630tez 1260000000n 630000000n 63tez

let test_xtz_to_token_563 = test_quote_accuracy "xtt_563" 640tez 640000000n 640000000n 64tez

let test_xtz_to_token_564 = test_quote_accuracy "xtt_564" 650tez 325000000n 650000000n 65tez

let test_xtz_to_token_565 = test_quote_accuracy "xtt_565" 660tez 1320000000n 660000000n 33tez

let test_xtz_to_token_566 = test_quote_accuracy "xtt_566" 670tez 670000000n 670000000n 134tez

let test_xtz_to_token_567 = test_quote_accuracy "xtt_567" 680tez 340000000n 680000000n 68tez

let test_xtz_to_token_568 = test_quote_accuracy "xtt_568" 690tez 1380000000n 690000000n 69tez

let test_xtz_to_token_569 = test_quote_accuracy "xtt_569" 700tez 700000000n 700000000n 70tez

let test_xtz_to_token_570 = test_quote_accuracy "xtt_570" 710tez 355000000n 710000000n 35.5tez

let test_xtz_to_token_571 = test_quote_accuracy "xtt_571" 720tez 1440000000n 720000000n 144tez

let test_xtz_to_token_572 = test_quote_accuracy "xtt_572" 730tez 730000000n 730000000n 73tez

let test_xtz_to_token_573 = test_quote_accuracy "xtt_573" 740tez 370000000n 740000000n 74tez

let test_xtz_to_token_574 = test_quote_accuracy "xtt_574" 750tez 1500000000n 750000000n 75tez

let test_xtz_to_token_575 = test_quote_accuracy "xtt_575" 760tez 760000000n 760000000n 38tez

let test_xtz_to_token_576 = test_quote_accuracy "xtt_576" 770tez 385000000n 770000000n 154tez

let test_xtz_to_token_577 = test_quote_accuracy "xtt_577" 780tez 1560000000n 780000000n 78tez

let test_xtz_to_token_578 = test_quote_accuracy "xtt_578" 790tez 790000000n 790000000n 79tez

let test_xtz_to_token_579 = test_quote_accuracy "xtt_579" 800tez 400000000n 800000000n 80tez

let test_xtz_to_token_580 = test_quote_accuracy "xtt_580" 810tez 1620000000n 810000000n 40.5tez

let test_xtz_to_token_581 = test_quote_accuracy "xtt_581" 820tez 820000000n 820000000n 164tez

let test_xtz_to_token_582 = test_quote_accuracy "xtt_582" 830tez 415000000n 830000000n 83tez

let test_xtz_to_token_583 = test_quote_accuracy "xtt_583" 840tez 1680000000n 840000000n 84tez

let test_xtz_to_token_584 = test_quote_accuracy "xtt_584" 850tez 850000000n 850000000n 85tez

let test_xtz_to_token_585 = test_quote_accuracy "xtt_585" 860tez 430000000n 860000000n 43tez

let test_xtz_to_token_586 = test_quote_accuracy "xtt_586" 870tez 1740000000n 870000000n 174tez

let test_xtz_to_token_587 = test_quote_accuracy "xtt_587" 880tez 880000000n 880000000n 88tez

let test_xtz_to_token_588 = test_quote_accuracy "xtt_588" 890tez 445000000n 890000000n 89tez

let test_xtz_to_token_589 = test_quote_accuracy "xtt_589" 900tez 1800000000n 900000000n 90tez

let test_xtz_to_token_590 = test_quote_accuracy "xtt_590" 910tez 910000000n 910000000n 45.5tez

let test_xtz_to_token_591 = test_quote_accuracy "xtt_591" 920tez 460000000n 920000000n 184tez

let test_xtz_to_token_592 = test_quote_accuracy "xtt_592" 930tez 1860000000n 930000000n 93tez

let test_xtz_to_token_593 = test_quote_accuracy "xtt_593" 940tez 940000000n 940000000n 94tez

let test_xtz_to_token_594 = test_quote_accuracy "xtt_594" 950tez 475000000n 950000000n 95tez

let test_xtz_to_token_595 = test_quote_accuracy "xtt_595" 960tez 1920000000n 960000000n 48tez

let test_xtz_to_token_596 = test_quote_accuracy "xtt_596" 970tez 970000000n 970000000n 194tez

let test_xtz_to_token_597 = test_quote_accuracy "xtt_597" 980tez 490000000n 980000000n 98tez

let test_xtz_to_token_598 = test_quote_accuracy "xtt_598" 990tez 1980000000n 990000000n 99tez

let test_xtz_to_token_599 = test_quote_accuracy "xtt_599" 1000tez 1000000000n 1000000000n 100tez

let test_xtz_to_token_600 = test_quote_accuracy "xtt_600" 10tez 5000000n 10000000n 0.5tez

let test_xtz_to_token_601 = test_quote_accuracy "xtt_601" 20tez 40000000n 20000000n 4tez

let test_xtz_to_token_602 = test_quote_accuracy "xtt_602" 30tez 30000000n 30000000n 3tez

let test_xtz_to_token_603 = test_quote_accuracy "xtt_603" 40tez 20000000n 40000000n 4tez

let test_xtz_to_token_604 = test_quote_accuracy "xtt_604" 50tez 100000000n 50000000n 5tez

let test_xtz_to_token_605 = test_quote_accuracy "xtt_605" 60tez 60000000n 60000000n 3tez

let test_xtz_to_token_606 = test_quote_accuracy "xtt_606" 70tez 35000000n 70000000n 14tez

let test_xtz_to_token_607 = test_quote_accuracy "xtt_607" 80tez 160000000n 80000000n 8tez

let test_xtz_to_token_608 = test_quote_accuracy "xtt_608" 90tez 90000000n 90000000n 9tez

let test_xtz_to_token_609 = test_quote_accuracy "xtt_609" 100tez 50000000n 100000000n 10tez

let test_xtz_to_token_610 = test_quote_accuracy "xtt_610" 110tez 220000000n 110000000n 5.5tez

let test_xtz_to_token_611 = test_quote_accuracy "xtt_611" 120tez 120000000n 120000000n 24tez

let test_xtz_to_token_612 = test_quote_accuracy "xtt_612" 130tez 65000000n 130000000n 13tez

let test_xtz_to_token_613 = test_quote_accuracy "xtt_613" 140tez 280000000n 140000000n 14tez

let test_xtz_to_token_614 = test_quote_accuracy "xtt_614" 150tez 150000000n 150000000n 15tez

let test_xtz_to_token_615 = test_quote_accuracy "xtt_615" 160tez 80000000n 160000000n 8tez

let test_xtz_to_token_616 = test_quote_accuracy "xtt_616" 170tez 340000000n 170000000n 34tez

let test_xtz_to_token_617 = test_quote_accuracy "xtt_617" 180tez 180000000n 180000000n 18tez

let test_xtz_to_token_618 = test_quote_accuracy "xtt_618" 190tez 95000000n 190000000n 19tez

let test_xtz_to_token_619 = test_quote_accuracy "xtt_619" 200tez 400000000n 200000000n 20tez

let test_xtz_to_token_620 = test_quote_accuracy "xtt_620" 210tez 210000000n 210000000n 10.5tez

let test_xtz_to_token_621 = test_quote_accuracy "xtt_621" 220tez 110000000n 220000000n 44tez

let test_xtz_to_token_622 = test_quote_accuracy "xtt_622" 230tez 460000000n 230000000n 23tez

let test_xtz_to_token_623 = test_quote_accuracy "xtt_623" 240tez 240000000n 240000000n 24tez

let test_xtz_to_token_624 = test_quote_accuracy "xtt_624" 250tez 125000000n 250000000n 25tez

let test_xtz_to_token_625 = test_quote_accuracy "xtt_625" 260tez 520000000n 260000000n 13tez

let test_xtz_to_token_626 = test_quote_accuracy "xtt_626" 270tez 270000000n 270000000n 54tez

let test_xtz_to_token_627 = test_quote_accuracy "xtt_627" 280tez 140000000n 280000000n 28tez

let test_xtz_to_token_628 = test_quote_accuracy "xtt_628" 290tez 580000000n 290000000n 29tez

let test_xtz_to_token_629 = test_quote_accuracy "xtt_629" 300tez 300000000n 300000000n 30tez

let test_xtz_to_token_630 = test_quote_accuracy "xtt_630" 310tez 155000000n 310000000n 15.5tez

let test_xtz_to_token_631 = test_quote_accuracy "xtt_631" 320tez 640000000n 320000000n 64tez

let test_xtz_to_token_632 = test_quote_accuracy "xtt_632" 330tez 330000000n 330000000n 33tez

let test_xtz_to_token_633 = test_quote_accuracy "xtt_633" 340tez 170000000n 340000000n 34tez

let test_xtz_to_token_634 = test_quote_accuracy "xtt_634" 350tez 700000000n 350000000n 35tez

let test_xtz_to_token_635 = test_quote_accuracy "xtt_635" 360tez 360000000n 360000000n 18tez

let test_xtz_to_token_636 = test_quote_accuracy "xtt_636" 370tez 185000000n 370000000n 74tez

let test_xtz_to_token_637 = test_quote_accuracy "xtt_637" 380tez 760000000n 380000000n 38tez

let test_xtz_to_token_638 = test_quote_accuracy "xtt_638" 390tez 390000000n 390000000n 39tez

let test_xtz_to_token_639 = test_quote_accuracy "xtt_639" 400tez 200000000n 400000000n 40tez

let test_xtz_to_token_640 = test_quote_accuracy "xtt_640" 410tez 820000000n 410000000n 20.5tez

let test_xtz_to_token_641 = test_quote_accuracy "xtt_641" 420tez 420000000n 420000000n 84tez

let test_xtz_to_token_642 = test_quote_accuracy "xtt_642" 430tez 215000000n 430000000n 43tez

let test_xtz_to_token_643 = test_quote_accuracy "xtt_643" 440tez 880000000n 440000000n 44tez

let test_xtz_to_token_644 = test_quote_accuracy "xtt_644" 450tez 450000000n 450000000n 45tez

let test_xtz_to_token_645 = test_quote_accuracy "xtt_645" 460tez 230000000n 460000000n 23tez

let test_xtz_to_token_646 = test_quote_accuracy "xtt_646" 470tez 940000000n 470000000n 94tez

let test_xtz_to_token_647 = test_quote_accuracy "xtt_647" 480tez 480000000n 480000000n 48tez

let test_xtz_to_token_648 = test_quote_accuracy "xtt_648" 490tez 245000000n 490000000n 49tez

let test_xtz_to_token_649 = test_quote_accuracy "xtt_649" 500tez 1000000000n 500000000n 50tez

let test_xtz_to_token_650 = test_quote_accuracy "xtt_650" 510tez 510000000n 510000000n 25.5tez

let test_xtz_to_token_651 = test_quote_accuracy "xtt_651" 520tez 260000000n 520000000n 104tez

let test_xtz_to_token_652 = test_quote_accuracy "xtt_652" 530tez 1060000000n 530000000n 53tez

let test_xtz_to_token_653 = test_quote_accuracy "xtt_653" 540tez 540000000n 540000000n 54tez

let test_xtz_to_token_654 = test_quote_accuracy "xtt_654" 550tez 275000000n 550000000n 55tez

let test_xtz_to_token_655 = test_quote_accuracy "xtt_655" 560tez 1120000000n 560000000n 28tez

let test_xtz_to_token_656 = test_quote_accuracy "xtt_656" 570tez 570000000n 570000000n 114tez

let test_xtz_to_token_657 = test_quote_accuracy "xtt_657" 580tez 290000000n 580000000n 58tez

let test_xtz_to_token_658 = test_quote_accuracy "xtt_658" 590tez 1180000000n 590000000n 59tez

let test_xtz_to_token_659 = test_quote_accuracy "xtt_659" 600tez 600000000n 600000000n 60tez

let test_xtz_to_token_660 = test_quote_accuracy "xtt_660" 610tez 305000000n 610000000n 30.5tez

let test_xtz_to_token_661 = test_quote_accuracy "xtt_661" 620tez 1240000000n 620000000n 124tez

let test_xtz_to_token_662 = test_quote_accuracy "xtt_662" 630tez 630000000n 630000000n 63tez

let test_xtz_to_token_663 = test_quote_accuracy "xtt_663" 640tez 320000000n 640000000n 64tez

let test_xtz_to_token_664 = test_quote_accuracy "xtt_664" 650tez 1300000000n 650000000n 65tez

let test_xtz_to_token_665 = test_quote_accuracy "xtt_665" 660tez 660000000n 660000000n 33tez

let test_xtz_to_token_666 = test_quote_accuracy "xtt_666" 670tez 335000000n 670000000n 134tez

let test_xtz_to_token_667 = test_quote_accuracy "xtt_667" 680tez 1360000000n 680000000n 68tez

let test_xtz_to_token_668 = test_quote_accuracy "xtt_668" 690tez 690000000n 690000000n 69tez

let test_xtz_to_token_669 = test_quote_accuracy "xtt_669" 700tez 350000000n 700000000n 70tez

let test_xtz_to_token_670 = test_quote_accuracy "xtt_670" 710tez 1420000000n 710000000n 35.5tez

let test_xtz_to_token_671 = test_quote_accuracy "xtt_671" 720tez 720000000n 720000000n 144tez

let test_xtz_to_token_672 = test_quote_accuracy "xtt_672" 730tez 365000000n 730000000n 73tez

let test_xtz_to_token_673 = test_quote_accuracy "xtt_673" 740tez 1480000000n 740000000n 74tez

let test_xtz_to_token_674 = test_quote_accuracy "xtt_674" 750tez 750000000n 750000000n 75tez

let test_xtz_to_token_675 = test_quote_accuracy "xtt_675" 760tez 380000000n 760000000n 38tez

let test_xtz_to_token_676 = test_quote_accuracy "xtt_676" 770tez 1540000000n 770000000n 154tez

let test_xtz_to_token_677 = test_quote_accuracy "xtt_677" 780tez 780000000n 780000000n 78tez

let test_xtz_to_token_678 = test_quote_accuracy "xtt_678" 790tez 395000000n 790000000n 79tez

let test_xtz_to_token_679 = test_quote_accuracy "xtt_679" 800tez 1600000000n 800000000n 80tez

let test_xtz_to_token_680 = test_quote_accuracy "xtt_680" 810tez 810000000n 810000000n 40.5tez

let test_xtz_to_token_681 = test_quote_accuracy "xtt_681" 820tez 410000000n 820000000n 164tez

let test_xtz_to_token_682 = test_quote_accuracy "xtt_682" 830tez 1660000000n 830000000n 83tez

let test_xtz_to_token_683 = test_quote_accuracy "xtt_683" 840tez 840000000n 840000000n 84tez

let test_xtz_to_token_684 = test_quote_accuracy "xtt_684" 850tez 425000000n 850000000n 85tez

let test_xtz_to_token_685 = test_quote_accuracy "xtt_685" 860tez 1720000000n 860000000n 43tez

let test_xtz_to_token_686 = test_quote_accuracy "xtt_686" 870tez 870000000n 870000000n 174tez

let test_xtz_to_token_687 = test_quote_accuracy "xtt_687" 880tez 440000000n 880000000n 88tez

let test_xtz_to_token_688 = test_quote_accuracy "xtt_688" 890tez 1780000000n 890000000n 89tez

let test_xtz_to_token_689 = test_quote_accuracy "xtt_689" 900tez 900000000n 900000000n 90tez

let test_xtz_to_token_690 = test_quote_accuracy "xtt_690" 910tez 455000000n 910000000n 45.5tez

let test_xtz_to_token_691 = test_quote_accuracy "xtt_691" 920tez 1840000000n 920000000n 184tez

let test_xtz_to_token_692 = test_quote_accuracy "xtt_692" 930tez 930000000n 930000000n 93tez

let test_xtz_to_token_693 = test_quote_accuracy "xtt_693" 940tez 470000000n 940000000n 94tez

let test_xtz_to_token_694 = test_quote_accuracy "xtt_694" 950tez 1900000000n 950000000n 95tez

let test_xtz_to_token_695 = test_quote_accuracy "xtt_695" 960tez 960000000n 960000000n 48tez

let test_xtz_to_token_696 = test_quote_accuracy "xtt_696" 970tez 485000000n 970000000n 194tez

let test_xtz_to_token_697 = test_quote_accuracy "xtt_697" 980tez 1960000000n 980000000n 98tez

let test_xtz_to_token_698 = test_quote_accuracy "xtt_698" 990tez 990000000n 990000000n 99tez

let test_xtz_to_token_699 = test_quote_accuracy "xtt_699" 1000tez 500000000n 1000000000n 100tez

let test_xtz_to_token_700 = test_quote_accuracy "xtt_700" 10tez 20000000n 10000000n 0.5tez

let test_xtz_to_token_701 = test_quote_accuracy "xtt_701" 20tez 20000000n 20000000n 4tez

let test_xtz_to_token_702 = test_quote_accuracy "xtt_702" 30tez 15000000n 30000000n 3tez

let test_xtz_to_token_703 = test_quote_accuracy "xtt_703" 40tez 80000000n 40000000n 4tez

let test_xtz_to_token_704 = test_quote_accuracy "xtt_704" 50tez 50000000n 50000000n 5tez

let test_xtz_to_token_705 = test_quote_accuracy "xtt_705" 60tez 30000000n 60000000n 3tez

let test_xtz_to_token_706 = test_quote_accuracy "xtt_706" 70tez 140000000n 70000000n 14tez

let test_xtz_to_token_707 = test_quote_accuracy "xtt_707" 80tez 80000000n 80000000n 8tez

let test_xtz_to_token_708 = test_quote_accuracy "xtt_708" 90tez 45000000n 90000000n 9tez

let test_xtz_to_token_709 = test_quote_accuracy "xtt_709" 100tez 200000000n 100000000n 10tez

let test_xtz_to_token_710 = test_quote_accuracy "xtt_710" 110tez 110000000n 110000000n 5.5tez

let test_xtz_to_token_711 = test_quote_accuracy "xtt_711" 120tez 60000000n 120000000n 24tez

let test_xtz_to_token_712 = test_quote_accuracy "xtt_712" 130tez 260000000n 130000000n 13tez

let test_xtz_to_token_713 = test_quote_accuracy "xtt_713" 140tez 140000000n 140000000n 14tez

let test_xtz_to_token_714 = test_quote_accuracy "xtt_714" 150tez 75000000n 150000000n 15tez

let test_xtz_to_token_715 = test_quote_accuracy "xtt_715" 160tez 320000000n 160000000n 8tez

let test_xtz_to_token_716 = test_quote_accuracy "xtt_716" 170tez 170000000n 170000000n 34tez

let test_xtz_to_token_717 = test_quote_accuracy "xtt_717" 180tez 90000000n 180000000n 18tez

let test_xtz_to_token_718 = test_quote_accuracy "xtt_718" 190tez 380000000n 190000000n 19tez

let test_xtz_to_token_719 = test_quote_accuracy "xtt_719" 200tez 200000000n 200000000n 20tez

let test_xtz_to_token_720 = test_quote_accuracy "xtt_720" 210tez 105000000n 210000000n 10.5tez

let test_xtz_to_token_721 = test_quote_accuracy "xtt_721" 220tez 440000000n 220000000n 44tez

let test_xtz_to_token_722 = test_quote_accuracy "xtt_722" 230tez 230000000n 230000000n 23tez

let test_xtz_to_token_723 = test_quote_accuracy "xtt_723" 240tez 120000000n 240000000n 24tez

let test_xtz_to_token_724 = test_quote_accuracy "xtt_724" 250tez 500000000n 250000000n 25tez

let test_xtz_to_token_725 = test_quote_accuracy "xtt_725" 260tez 260000000n 260000000n 13tez

let test_xtz_to_token_726 = test_quote_accuracy "xtt_726" 270tez 135000000n 270000000n 54tez

let test_xtz_to_token_727 = test_quote_accuracy "xtt_727" 280tez 560000000n 280000000n 28tez

let test_xtz_to_token_728 = test_quote_accuracy "xtt_728" 290tez 290000000n 290000000n 29tez

let test_xtz_to_token_729 = test_quote_accuracy "xtt_729" 300tez 150000000n 300000000n 30tez

let test_xtz_to_token_730 = test_quote_accuracy "xtt_730" 310tez 620000000n 310000000n 15.5tez

let test_xtz_to_token_731 = test_quote_accuracy "xtt_731" 320tez 320000000n 320000000n 64tez

let test_xtz_to_token_732 = test_quote_accuracy "xtt_732" 330tez 165000000n 330000000n 33tez

let test_xtz_to_token_733 = test_quote_accuracy "xtt_733" 340tez 680000000n 340000000n 34tez

let test_xtz_to_token_734 = test_quote_accuracy "xtt_734" 350tez 350000000n 350000000n 35tez

let test_xtz_to_token_735 = test_quote_accuracy "xtt_735" 360tez 180000000n 360000000n 18tez

let test_xtz_to_token_736 = test_quote_accuracy "xtt_736" 370tez 740000000n 370000000n 74tez

let test_xtz_to_token_737 = test_quote_accuracy "xtt_737" 380tez 380000000n 380000000n 38tez

let test_xtz_to_token_738 = test_quote_accuracy "xtt_738" 390tez 195000000n 390000000n 39tez

let test_xtz_to_token_739 = test_quote_accuracy "xtt_739" 400tez 800000000n 400000000n 40tez

let test_xtz_to_token_740 = test_quote_accuracy "xtt_740" 410tez 410000000n 410000000n 20.5tez

let test_xtz_to_token_741 = test_quote_accuracy "xtt_741" 420tez 210000000n 420000000n 84tez

let test_xtz_to_token_742 = test_quote_accuracy "xtt_742" 430tez 860000000n 430000000n 43tez

let test_xtz_to_token_743 = test_quote_accuracy "xtt_743" 440tez 440000000n 440000000n 44tez

let test_xtz_to_token_744 = test_quote_accuracy "xtt_744" 450tez 225000000n 450000000n 45tez

let test_xtz_to_token_745 = test_quote_accuracy "xtt_745" 460tez 920000000n 460000000n 23tez

let test_xtz_to_token_746 = test_quote_accuracy "xtt_746" 470tez 470000000n 470000000n 94tez

let test_xtz_to_token_747 = test_quote_accuracy "xtt_747" 480tez 240000000n 480000000n 48tez

let test_xtz_to_token_748 = test_quote_accuracy "xtt_748" 490tez 980000000n 490000000n 49tez

let test_xtz_to_token_749 = test_quote_accuracy "xtt_749" 500tez 500000000n 500000000n 50tez

let test_xtz_to_token_750 = test_quote_accuracy "xtt_750" 510tez 255000000n 510000000n 25.5tez

let test_xtz_to_token_751 = test_quote_accuracy "xtt_751" 520tez 1040000000n 520000000n 104tez

let test_xtz_to_token_752 = test_quote_accuracy "xtt_752" 530tez 530000000n 530000000n 53tez

let test_xtz_to_token_753 = test_quote_accuracy "xtt_753" 540tez 270000000n 540000000n 54tez

let test_xtz_to_token_754 = test_quote_accuracy "xtt_754" 550tez 1100000000n 550000000n 55tez

let test_xtz_to_token_755 = test_quote_accuracy "xtt_755" 560tez 560000000n 560000000n 28tez

let test_xtz_to_token_756 = test_quote_accuracy "xtt_756" 570tez 285000000n 570000000n 114tez

let test_xtz_to_token_757 = test_quote_accuracy "xtt_757" 580tez 1160000000n 580000000n 58tez

let test_xtz_to_token_758 = test_quote_accuracy "xtt_758" 590tez 590000000n 590000000n 59tez

let test_xtz_to_token_759 = test_quote_accuracy "xtt_759" 600tez 300000000n 600000000n 60tez

let test_xtz_to_token_760 = test_quote_accuracy "xtt_760" 610tez 1220000000n 610000000n 30.5tez

let test_xtz_to_token_761 = test_quote_accuracy "xtt_761" 620tez 620000000n 620000000n 124tez

let test_xtz_to_token_762 = test_quote_accuracy "xtt_762" 630tez 315000000n 630000000n 63tez

let test_xtz_to_token_763 = test_quote_accuracy "xtt_763" 640tez 1280000000n 640000000n 64tez

let test_xtz_to_token_764 = test_quote_accuracy "xtt_764" 650tez 650000000n 650000000n 65tez

let test_xtz_to_token_765 = test_quote_accuracy "xtt_765" 660tez 330000000n 660000000n 33tez

let test_xtz_to_token_766 = test_quote_accuracy "xtt_766" 670tez 1340000000n 670000000n 134tez

let test_xtz_to_token_767 = test_quote_accuracy "xtt_767" 680tez 680000000n 680000000n 68tez

let test_xtz_to_token_768 = test_quote_accuracy "xtt_768" 690tez 345000000n 690000000n 69tez

let test_xtz_to_token_769 = test_quote_accuracy "xtt_769" 700tez 1400000000n 700000000n 70tez

let test_xtz_to_token_770 = test_quote_accuracy "xtt_770" 710tez 710000000n 710000000n 35.5tez

let test_xtz_to_token_771 = test_quote_accuracy "xtt_771" 720tez 360000000n 720000000n 144tez

let test_xtz_to_token_772 = test_quote_accuracy "xtt_772" 730tez 1460000000n 730000000n 73tez

let test_xtz_to_token_773 = test_quote_accuracy "xtt_773" 740tez 740000000n 740000000n 74tez

let test_xtz_to_token_774 = test_quote_accuracy "xtt_774" 750tez 375000000n 750000000n 75tez

let test_xtz_to_token_775 = test_quote_accuracy "xtt_775" 760tez 1520000000n 760000000n 38tez

let test_xtz_to_token_776 = test_quote_accuracy "xtt_776" 770tez 770000000n 770000000n 154tez

let test_xtz_to_token_777 = test_quote_accuracy "xtt_777" 780tez 390000000n 780000000n 78tez

let test_xtz_to_token_778 = test_quote_accuracy "xtt_778" 790tez 1580000000n 790000000n 79tez

let test_xtz_to_token_779 = test_quote_accuracy "xtt_779" 800tez 800000000n 800000000n 80tez

let test_xtz_to_token_780 = test_quote_accuracy "xtt_780" 810tez 405000000n 810000000n 40.5tez

let test_xtz_to_token_781 = test_quote_accuracy "xtt_781" 820tez 1640000000n 820000000n 164tez

let test_xtz_to_token_782 = test_quote_accuracy "xtt_782" 830tez 830000000n 830000000n 83tez

let test_xtz_to_token_783 = test_quote_accuracy "xtt_783" 840tez 420000000n 840000000n 84tez

let test_xtz_to_token_784 = test_quote_accuracy "xtt_784" 850tez 1700000000n 850000000n 85tez

let test_xtz_to_token_785 = test_quote_accuracy "xtt_785" 860tez 860000000n 860000000n 43tez

let test_xtz_to_token_786 = test_quote_accuracy "xtt_786" 870tez 435000000n 870000000n 174tez

let test_xtz_to_token_787 = test_quote_accuracy "xtt_787" 880tez 1760000000n 880000000n 88tez

let test_xtz_to_token_788 = test_quote_accuracy "xtt_788" 890tez 890000000n 890000000n 89tez

let test_xtz_to_token_789 = test_quote_accuracy "xtt_789" 900tez 450000000n 900000000n 90tez

let test_xtz_to_token_790 = test_quote_accuracy "xtt_790" 910tez 1820000000n 910000000n 45.5tez

let test_xtz_to_token_791 = test_quote_accuracy "xtt_791" 920tez 920000000n 920000000n 184tez

let test_xtz_to_token_792 = test_quote_accuracy "xtt_792" 930tez 465000000n 930000000n 93tez

let test_xtz_to_token_793 = test_quote_accuracy "xtt_793" 940tez 1880000000n 940000000n 94tez

let test_xtz_to_token_794 = test_quote_accuracy "xtt_794" 950tez 950000000n 950000000n 95tez

let test_xtz_to_token_795 = test_quote_accuracy "xtt_795" 960tez 480000000n 960000000n 48tez

let test_xtz_to_token_796 = test_quote_accuracy "xtt_796" 970tez 1940000000n 970000000n 194tez

let test_xtz_to_token_797 = test_quote_accuracy "xtt_797" 980tez 980000000n 980000000n 98tez

let test_xtz_to_token_798 = test_quote_accuracy "xtt_798" 990tez 495000000n 990000000n 99tez

let test_xtz_to_token_799 = test_quote_accuracy "xtt_799" 1000tez 2000000000n 1000000000n 100tez

let test_xtz_to_token_800 = test_quote_accuracy "xtt_800" 10tez 10000000n 10000000n 0.5tez

(*****************************************************************************)
(* XTZ to Token Quote Tests - More Variations (Batch 801-1000)             *)
(*****************************************************************************)
let test_xtz_to_token_801 = test_quote_accuracy "xtt_801" 20tez 10000000n 20000000n 4tez

let test_xtz_to_token_802 = test_quote_accuracy "xtt_802" 30tez 60000000n 30000000n 3tez

let test_xtz_to_token_803 = test_quote_accuracy "xtt_803" 40tez 40000000n 40000000n 4tez

let test_xtz_to_token_804 = test_quote_accuracy "xtt_804" 50tez 25000000n 50000000n 5tez

let test_xtz_to_token_805 = test_quote_accuracy "xtt_805" 60tez 120000000n 60000000n 3tez

let test_xtz_to_token_806 = test_quote_accuracy "xtt_806" 70tez 70000000n 70000000n 14tez

let test_xtz_to_token_807 = test_quote_accuracy "xtt_807" 80tez 40000000n 80000000n 8tez

let test_xtz_to_token_808 = test_quote_accuracy "xtt_808" 90tez 180000000n 90000000n 9tez

let test_xtz_to_token_809 = test_quote_accuracy "xtt_809" 100tez 100000000n 100000000n 10tez

let test_xtz_to_token_810 = test_quote_accuracy "xtt_810" 110tez 55000000n 110000000n 5.5tez

let test_xtz_to_token_811 = test_quote_accuracy "xtt_811" 120tez 240000000n 120000000n 24tez

let test_xtz_to_token_812 = test_quote_accuracy "xtt_812" 130tez 130000000n 130000000n 13tez

let test_xtz_to_token_813 = test_quote_accuracy "xtt_813" 140tez 70000000n 140000000n 14tez

let test_xtz_to_token_814 = test_quote_accuracy "xtt_814" 150tez 300000000n 150000000n 15tez

let test_xtz_to_token_815 = test_quote_accuracy "xtt_815" 160tez 160000000n 160000000n 8tez

let test_xtz_to_token_816 = test_quote_accuracy "xtt_816" 170tez 85000000n 170000000n 34tez

let test_xtz_to_token_817 = test_quote_accuracy "xtt_817" 180tez 360000000n 180000000n 18tez

let test_xtz_to_token_818 = test_quote_accuracy "xtt_818" 190tez 190000000n 190000000n 19tez

let test_xtz_to_token_819 = test_quote_accuracy "xtt_819" 200tez 100000000n 200000000n 20tez

let test_xtz_to_token_820 = test_quote_accuracy "xtt_820" 210tez 420000000n 210000000n 10.5tez

let test_xtz_to_token_821 = test_quote_accuracy "xtt_821" 220tez 220000000n 220000000n 44tez

let test_xtz_to_token_822 = test_quote_accuracy "xtt_822" 230tez 115000000n 230000000n 23tez

let test_xtz_to_token_823 = test_quote_accuracy "xtt_823" 240tez 480000000n 240000000n 24tez

let test_xtz_to_token_824 = test_quote_accuracy "xtt_824" 250tez 250000000n 250000000n 25tez

let test_xtz_to_token_825 = test_quote_accuracy "xtt_825" 260tez 130000000n 260000000n 13tez

let test_xtz_to_token_826 = test_quote_accuracy "xtt_826" 270tez 540000000n 270000000n 54tez

let test_xtz_to_token_827 = test_quote_accuracy "xtt_827" 280tez 280000000n 280000000n 28tez

let test_xtz_to_token_828 = test_quote_accuracy "xtt_828" 290tez 145000000n 290000000n 29tez

let test_xtz_to_token_829 = test_quote_accuracy "xtt_829" 300tez 600000000n 300000000n 30tez

let test_xtz_to_token_830 = test_quote_accuracy "xtt_830" 310tez 310000000n 310000000n 15.5tez

let test_xtz_to_token_831 = test_quote_accuracy "xtt_831" 320tez 160000000n 320000000n 64tez

let test_xtz_to_token_832 = test_quote_accuracy "xtt_832" 330tez 660000000n 330000000n 33tez

let test_xtz_to_token_833 = test_quote_accuracy "xtt_833" 340tez 340000000n 340000000n 34tez

let test_xtz_to_token_834 = test_quote_accuracy "xtt_834" 350tez 175000000n 350000000n 35tez

let test_xtz_to_token_835 = test_quote_accuracy "xtt_835" 360tez 720000000n 360000000n 18tez

let test_xtz_to_token_836 = test_quote_accuracy "xtt_836" 370tez 370000000n 370000000n 74tez

let test_xtz_to_token_837 = test_quote_accuracy "xtt_837" 380tez 190000000n 380000000n 38tez

let test_xtz_to_token_838 = test_quote_accuracy "xtt_838" 390tez 780000000n 390000000n 39tez

let test_xtz_to_token_839 = test_quote_accuracy "xtt_839" 400tez 400000000n 400000000n 40tez

let test_xtz_to_token_840 = test_quote_accuracy "xtt_840" 410tez 205000000n 410000000n 20.5tez

let test_xtz_to_token_841 = test_quote_accuracy "xtt_841" 420tez 840000000n 420000000n 84tez

let test_xtz_to_token_842 = test_quote_accuracy "xtt_842" 430tez 430000000n 430000000n 43tez

let test_xtz_to_token_843 = test_quote_accuracy "xtt_843" 440tez 220000000n 440000000n 44tez

let test_xtz_to_token_844 = test_quote_accuracy "xtt_844" 450tez 900000000n 450000000n 45tez

let test_xtz_to_token_845 = test_quote_accuracy "xtt_845" 460tez 460000000n 460000000n 23tez

let test_xtz_to_token_846 = test_quote_accuracy "xtt_846" 470tez 235000000n 470000000n 94tez

let test_xtz_to_token_847 = test_quote_accuracy "xtt_847" 480tez 960000000n 480000000n 48tez

let test_xtz_to_token_848 = test_quote_accuracy "xtt_848" 490tez 490000000n 490000000n 49tez

let test_xtz_to_token_849 = test_quote_accuracy "xtt_849" 500tez 250000000n 500000000n 50tez

let test_xtz_to_token_850 = test_quote_accuracy "xtt_850" 510tez 1020000000n 510000000n 25.5tez

let test_xtz_to_token_851 = test_quote_accuracy "xtt_851" 520tez 520000000n 520000000n 104tez

let test_xtz_to_token_852 = test_quote_accuracy "xtt_852" 530tez 265000000n 530000000n 53tez

let test_xtz_to_token_853 = test_quote_accuracy "xtt_853" 540tez 1080000000n 540000000n 54tez

let test_xtz_to_token_854 = test_quote_accuracy "xtt_854" 550tez 550000000n 550000000n 55tez

let test_xtz_to_token_855 = test_quote_accuracy "xtt_855" 560tez 280000000n 560000000n 28tez

let test_xtz_to_token_856 = test_quote_accuracy "xtt_856" 570tez 1140000000n 570000000n 114tez

let test_xtz_to_token_857 = test_quote_accuracy "xtt_857" 580tez 580000000n 580000000n 58tez

let test_xtz_to_token_858 = test_quote_accuracy "xtt_858" 590tez 295000000n 590000000n 59tez

let test_xtz_to_token_859 = test_quote_accuracy "xtt_859" 600tez 1200000000n 600000000n 60tez

let test_xtz_to_token_860 = test_quote_accuracy "xtt_860" 610tez 610000000n 610000000n 30.5tez

let test_xtz_to_token_861 = test_quote_accuracy "xtt_861" 620tez 310000000n 620000000n 124tez

let test_xtz_to_token_862 = test_quote_accuracy "xtt_862" 630tez 1260000000n 630000000n 63tez

let test_xtz_to_token_863 = test_quote_accuracy "xtt_863" 640tez 640000000n 640000000n 64tez

let test_xtz_to_token_864 = test_quote_accuracy "xtt_864" 650tez 325000000n 650000000n 65tez

let test_xtz_to_token_865 = test_quote_accuracy "xtt_865" 660tez 1320000000n 660000000n 33tez

let test_xtz_to_token_866 = test_quote_accuracy "xtt_866" 670tez 670000000n 670000000n 134tez

let test_xtz_to_token_867 = test_quote_accuracy "xtt_867" 680tez 340000000n 680000000n 68tez

let test_xtz_to_token_868 = test_quote_accuracy "xtt_868" 690tez 1380000000n 690000000n 69tez

let test_xtz_to_token_869 = test_quote_accuracy "xtt_869" 700tez 700000000n 700000000n 70tez

let test_xtz_to_token_870 = test_quote_accuracy "xtt_870" 710tez 355000000n 710000000n 35.5tez

let test_xtz_to_token_871 = test_quote_accuracy "xtt_871" 720tez 1440000000n 720000000n 144tez

let test_xtz_to_token_872 = test_quote_accuracy "xtt_872" 730tez 730000000n 730000000n 73tez

let test_xtz_to_token_873 = test_quote_accuracy "xtt_873" 740tez 370000000n 740000000n 74tez

let test_xtz_to_token_874 = test_quote_accuracy "xtt_874" 750tez 1500000000n 750000000n 75tez

let test_xtz_to_token_875 = test_quote_accuracy "xtt_875" 760tez 760000000n 760000000n 38tez

let test_xtz_to_token_876 = test_quote_accuracy "xtt_876" 770tez 385000000n 770000000n 154tez

let test_xtz_to_token_877 = test_quote_accuracy "xtt_877" 780tez 1560000000n 780000000n 78tez

let test_xtz_to_token_878 = test_quote_accuracy "xtt_878" 790tez 790000000n 790000000n 79tez

let test_xtz_to_token_879 = test_quote_accuracy "xtt_879" 800tez 400000000n 800000000n 80tez

let test_xtz_to_token_880 = test_quote_accuracy "xtt_880" 810tez 1620000000n 810000000n 40.5tez

let test_xtz_to_token_881 = test_quote_accuracy "xtt_881" 820tez 820000000n 820000000n 164tez

let test_xtz_to_token_882 = test_quote_accuracy "xtt_882" 830tez 415000000n 830000000n 83tez

let test_xtz_to_token_883 = test_quote_accuracy "xtt_883" 840tez 1680000000n 840000000n 84tez

let test_xtz_to_token_884 = test_quote_accuracy "xtt_884" 850tez 850000000n 850000000n 85tez

let test_xtz_to_token_885 = test_quote_accuracy "xtt_885" 860tez 430000000n 860000000n 43tez

let test_xtz_to_token_886 = test_quote_accuracy "xtt_886" 870tez 1740000000n 870000000n 174tez

let test_xtz_to_token_887 = test_quote_accuracy "xtt_887" 880tez 880000000n 880000000n 88tez

let test_xtz_to_token_888 = test_quote_accuracy "xtt_888" 890tez 445000000n 890000000n 89tez

let test_xtz_to_token_889 = test_quote_accuracy "xtt_889" 900tez 1800000000n 900000000n 90tez

let test_xtz_to_token_890 = test_quote_accuracy "xtt_890" 910tez 910000000n 910000000n 45.5tez

let test_xtz_to_token_891 = test_quote_accuracy "xtt_891" 920tez 460000000n 920000000n 184tez

let test_xtz_to_token_892 = test_quote_accuracy "xtt_892" 930tez 1860000000n 930000000n 93tez

let test_xtz_to_token_893 = test_quote_accuracy "xtt_893" 940tez 940000000n 940000000n 94tez

let test_xtz_to_token_894 = test_quote_accuracy "xtt_894" 950tez 475000000n 950000000n 95tez

let test_xtz_to_token_895 = test_quote_accuracy "xtt_895" 960tez 1920000000n 960000000n 48tez

let test_xtz_to_token_896 = test_quote_accuracy "xtt_896" 970tez 970000000n 970000000n 194tez

let test_xtz_to_token_897 = test_quote_accuracy "xtt_897" 980tez 490000000n 980000000n 98tez

let test_xtz_to_token_898 = test_quote_accuracy "xtt_898" 990tez 1980000000n 990000000n 99tez

let test_xtz_to_token_899 = test_quote_accuracy "xtt_899" 1000tez 1000000000n 1000000000n 100tez

let test_xtz_to_token_900 = test_quote_accuracy "xtt_900" 10tez 5000000n 10000000n 0.5tez

let test_xtz_to_token_901 = test_quote_accuracy "xtt_901" 20tez 40000000n 20000000n 4tez

let test_xtz_to_token_902 = test_quote_accuracy "xtt_902" 30tez 30000000n 30000000n 3tez

let test_xtz_to_token_903 = test_quote_accuracy "xtt_903" 40tez 20000000n 40000000n 4tez

let test_xtz_to_token_904 = test_quote_accuracy "xtt_904" 50tez 100000000n 50000000n 5tez

let test_xtz_to_token_905 = test_quote_accuracy "xtt_905" 60tez 60000000n 60000000n 3tez

let test_xtz_to_token_906 = test_quote_accuracy "xtt_906" 70tez 35000000n 70000000n 14tez

let test_xtz_to_token_907 = test_quote_accuracy "xtt_907" 80tez 160000000n 80000000n 8tez

let test_xtz_to_token_908 = test_quote_accuracy "xtt_908" 90tez 90000000n 90000000n 9tez

let test_xtz_to_token_909 = test_quote_accuracy "xtt_909" 100tez 50000000n 100000000n 10tez

let test_xtz_to_token_910 = test_quote_accuracy "xtt_910" 110tez 220000000n 110000000n 5.5tez

let test_xtz_to_token_911 = test_quote_accuracy "xtt_911" 120tez 120000000n 120000000n 24tez

let test_xtz_to_token_912 = test_quote_accuracy "xtt_912" 130tez 65000000n 130000000n 13tez

let test_xtz_to_token_913 = test_quote_accuracy "xtt_913" 140tez 280000000n 140000000n 14tez

let test_xtz_to_token_914 = test_quote_accuracy "xtt_914" 150tez 150000000n 150000000n 15tez

let test_xtz_to_token_915 = test_quote_accuracy "xtt_915" 160tez 80000000n 160000000n 8tez

let test_xtz_to_token_916 = test_quote_accuracy "xtt_916" 170tez 340000000n 170000000n 34tez

let test_xtz_to_token_917 = test_quote_accuracy "xtt_917" 180tez 180000000n 180000000n 18tez

let test_xtz_to_token_918 = test_quote_accuracy "xtt_918" 190tez 95000000n 190000000n 19tez

let test_xtz_to_token_919 = test_quote_accuracy "xtt_919" 200tez 400000000n 200000000n 20tez

let test_xtz_to_token_920 = test_quote_accuracy "xtt_920" 210tez 210000000n 210000000n 10.5tez

let test_xtz_to_token_921 = test_quote_accuracy "xtt_921" 220tez 110000000n 220000000n 44tez

let test_xtz_to_token_922 = test_quote_accuracy "xtt_922" 230tez 460000000n 230000000n 23tez

let test_xtz_to_token_923 = test_quote_accuracy "xtt_923" 240tez 240000000n 240000000n 24tez

let test_xtz_to_token_924 = test_quote_accuracy "xtt_924" 250tez 125000000n 250000000n 25tez

let test_xtz_to_token_925 = test_quote_accuracy "xtt_925" 260tez 520000000n 260000000n 13tez

let test_xtz_to_token_926 = test_quote_accuracy "xtt_926" 270tez 270000000n 270000000n 54tez

let test_xtz_to_token_927 = test_quote_accuracy "xtt_927" 280tez 140000000n 280000000n 28tez

let test_xtz_to_token_928 = test_quote_accuracy "xtt_928" 290tez 580000000n 290000000n 29tez

let test_xtz_to_token_929 = test_quote_accuracy "xtt_929" 300tez 300000000n 300000000n 30tez

let test_xtz_to_token_930 = test_quote_accuracy "xtt_930" 310tez 155000000n 310000000n 15.5tez

let test_xtz_to_token_931 = test_quote_accuracy "xtt_931" 320tez 640000000n 320000000n 64tez

let test_xtz_to_token_932 = test_quote_accuracy "xtt_932" 330tez 330000000n 330000000n 33tez

let test_xtz_to_token_933 = test_quote_accuracy "xtt_933" 340tez 170000000n 340000000n 34tez

let test_xtz_to_token_934 = test_quote_accuracy "xtt_934" 350tez 700000000n 350000000n 35tez

let test_xtz_to_token_935 = test_quote_accuracy "xtt_935" 360tez 360000000n 360000000n 18tez

let test_xtz_to_token_936 = test_quote_accuracy "xtt_936" 370tez 185000000n 370000000n 74tez

let test_xtz_to_token_937 = test_quote_accuracy "xtt_937" 380tez 760000000n 380000000n 38tez

let test_xtz_to_token_938 = test_quote_accuracy "xtt_938" 390tez 390000000n 390000000n 39tez

let test_xtz_to_token_939 = test_quote_accuracy "xtt_939" 400tez 200000000n 400000000n 40tez

let test_xtz_to_token_940 = test_quote_accuracy "xtt_940" 410tez 820000000n 410000000n 20.5tez

let test_xtz_to_token_941 = test_quote_accuracy "xtt_941" 420tez 420000000n 420000000n 84tez

let test_xtz_to_token_942 = test_quote_accuracy "xtt_942" 430tez 215000000n 430000000n 43tez

let test_xtz_to_token_943 = test_quote_accuracy "xtt_943" 440tez 880000000n 440000000n 44tez

let test_xtz_to_token_944 = test_quote_accuracy "xtt_944" 450tez 450000000n 450000000n 45tez

let test_xtz_to_token_945 = test_quote_accuracy "xtt_945" 460tez 230000000n 460000000n 23tez

let test_xtz_to_token_946 = test_quote_accuracy "xtt_946" 470tez 940000000n 470000000n 94tez

let test_xtz_to_token_947 = test_quote_accuracy "xtt_947" 480tez 480000000n 480000000n 48tez

let test_xtz_to_token_948 = test_quote_accuracy "xtt_948" 490tez 245000000n 490000000n 49tez

let test_xtz_to_token_949 = test_quote_accuracy "xtt_949" 500tez 1000000000n 500000000n 50tez

let test_xtz_to_token_950 = test_quote_accuracy "xtt_950" 510tez 510000000n 510000000n 25.5tez

let test_xtz_to_token_951 = test_quote_accuracy "xtt_951" 520tez 260000000n 520000000n 104tez

let test_xtz_to_token_952 = test_quote_accuracy "xtt_952" 530tez 1060000000n 530000000n 53tez

let test_xtz_to_token_953 = test_quote_accuracy "xtt_953" 540tez 540000000n 540000000n 54tez

let test_xtz_to_token_954 = test_quote_accuracy "xtt_954" 550tez 275000000n 550000000n 55tez

let test_xtz_to_token_955 = test_quote_accuracy "xtt_955" 560tez 1120000000n 560000000n 28tez

let test_xtz_to_token_956 = test_quote_accuracy "xtt_956" 570tez 570000000n 570000000n 114tez

let test_xtz_to_token_957 = test_quote_accuracy "xtt_957" 580tez 290000000n 580000000n 58tez

let test_xtz_to_token_958 = test_quote_accuracy "xtt_958" 590tez 1180000000n 590000000n 59tez

let test_xtz_to_token_959 = test_quote_accuracy "xtt_959" 600tez 600000000n 600000000n 60tez

let test_xtz_to_token_960 = test_quote_accuracy "xtt_960" 610tez 305000000n 610000000n 30.5tez

let test_xtz_to_token_961 = test_quote_accuracy "xtt_961" 620tez 1240000000n 620000000n 124tez

let test_xtz_to_token_962 = test_quote_accuracy "xtt_962" 630tez 630000000n 630000000n 63tez

let test_xtz_to_token_963 = test_quote_accuracy "xtt_963" 640tez 320000000n 640000000n 64tez

let test_xtz_to_token_964 = test_quote_accuracy "xtt_964" 650tez 1300000000n 650000000n 65tez

let test_xtz_to_token_965 = test_quote_accuracy "xtt_965" 660tez 660000000n 660000000n 33tez

let test_xtz_to_token_966 = test_quote_accuracy "xtt_966" 670tez 335000000n 670000000n 134tez

let test_xtz_to_token_967 = test_quote_accuracy "xtt_967" 680tez 1360000000n 680000000n 68tez

let test_xtz_to_token_968 = test_quote_accuracy "xtt_968" 690tez 690000000n 690000000n 69tez

let test_xtz_to_token_969 = test_quote_accuracy "xtt_969" 700tez 350000000n 700000000n 70tez

let test_xtz_to_token_970 = test_quote_accuracy "xtt_970" 710tez 1420000000n 710000000n 35.5tez

let test_xtz_to_token_971 = test_quote_accuracy "xtt_971" 720tez 720000000n 720000000n 144tez

let test_xtz_to_token_972 = test_quote_accuracy "xtt_972" 730tez 365000000n 730000000n 73tez

let test_xtz_to_token_973 = test_quote_accuracy "xtt_973" 740tez 1480000000n 740000000n 74tez

let test_xtz_to_token_974 = test_quote_accuracy "xtt_974" 750tez 750000000n 750000000n 75tez

let test_xtz_to_token_975 = test_quote_accuracy "xtt_975" 760tez 380000000n 760000000n 38tez

let test_xtz_to_token_976 = test_quote_accuracy "xtt_976" 770tez 1540000000n 770000000n 154tez

let test_xtz_to_token_977 = test_quote_accuracy "xtt_977" 780tez 780000000n 780000000n 78tez

let test_xtz_to_token_978 = test_quote_accuracy "xtt_978" 790tez 395000000n 790000000n 79tez

let test_xtz_to_token_979 = test_quote_accuracy "xtt_979" 800tez 1600000000n 800000000n 80tez

let test_xtz_to_token_980 = test_quote_accuracy "xtt_980" 810tez 810000000n 810000000n 40.5tez

let test_xtz_to_token_981 = test_quote_accuracy "xtt_981" 820tez 410000000n 820000000n 164tez

let test_xtz_to_token_982 = test_quote_accuracy "xtt_982" 830tez 1660000000n 830000000n 83tez

let test_xtz_to_token_983 = test_quote_accuracy "xtt_983" 840tez 840000000n 840000000n 84tez

let test_xtz_to_token_984 = test_quote_accuracy "xtt_984" 850tez 425000000n 850000000n 85tez

let test_xtz_to_token_985 = test_quote_accuracy "xtt_985" 860tez 1720000000n 860000000n 43tez

let test_xtz_to_token_986 = test_quote_accuracy "xtt_986" 870tez 870000000n 870000000n 174tez

let test_xtz_to_token_987 = test_quote_accuracy "xtt_987" 880tez 440000000n 880000000n 88tez

let test_xtz_to_token_988 = test_quote_accuracy "xtt_988" 890tez 1780000000n 890000000n 89tez

let test_xtz_to_token_989 = test_quote_accuracy "xtt_989" 900tez 900000000n 900000000n 90tez

let test_xtz_to_token_990 = test_quote_accuracy "xtt_990" 910tez 455000000n 910000000n 45.5tez

let test_xtz_to_token_991 = test_quote_accuracy "xtt_991" 920tez 1840000000n 920000000n 184tez

let test_xtz_to_token_992 = test_quote_accuracy "xtt_992" 930tez 930000000n 930000000n 93tez

let test_xtz_to_token_993 = test_quote_accuracy "xtt_993" 940tez 470000000n 940000000n 94tez

let test_xtz_to_token_994 = test_quote_accuracy "xtt_994" 950tez 1900000000n 950000000n 95tez

let test_xtz_to_token_995 = test_quote_accuracy "xtt_995" 960tez 960000000n 960000000n 48tez

let test_xtz_to_token_996 = test_quote_accuracy "xtt_996" 970tez 485000000n 970000000n 194tez

let test_xtz_to_token_997 = test_quote_accuracy "xtt_997" 980tez 1960000000n 980000000n 98tez

let test_xtz_to_token_998 = test_quote_accuracy "xtt_998" 990tez 990000000n 990000000n 99tez

let test_xtz_to_token_999 = test_quote_accuracy "xtt_999" 1000tez 500000000n 1000000000n 100tez

let test_xtz_to_token_1000 = test_quote_accuracy "xtt_1000" 10tez 20000000n 10000000n 0.5tez

(*****************************************************************************)
(* XTZ to Token - Unusual/Fractional Inputs (1001-1100)                      *)
(*****************************************************************************)
let test_xtz_to_token_1001 = test_quote_accuracy "xtt_1001" 0.001tez 1000n 1000n 1.043124tez
let test_xtz_to_token_1002 = test_quote_accuracy "xtt_1002" 0.003tez 3000n 3000n 2.078999tez
let test_xtz_to_token_1003 = test_quote_accuracy "xtt_1003" 0.007tez 14000n 14000n 4.9tez
let test_xtz_to_token_1004 = test_quote_accuracy "xtt_1004" 0.013tez 39000n 39000n 0.000142tez
let test_xtz_to_token_1005 = test_quote_accuracy "xtt_1005" 0.019tez 19000n 19000n 0.000247tez
let test_xtz_to_token_1006 = test_quote_accuracy "xtt_1006" 0.023tez 46000n 46000n 0.000391tez
let test_xtz_to_token_1007 = test_quote_accuracy "xtt_1007" 0.031tez 31000n 31000n 0.000589tez
let test_xtz_to_token_1008 = test_quote_accuracy "xtt_1008" 0.037tez 74000n 74000n 0.000851tez
let test_xtz_to_token_1009 = test_quote_accuracy "xtt_1009" 0.041tez 0n 0n 0.011892tez
let test_xtz_to_token_1010 = test_quote_accuracy "xtt_1010" 0.047tez 47000n 47000n 0.001457tez
let test_xtz_to_token_1011 = test_quote_accuracy "xtt_1011" 0.053tez 106000n 106000n 0.001960tez
let test_xtz_to_token_1012 = test_quote_accuracy "xtt_1012" 0.059tez 59000n 59000n 0.002419tez
let test_xtz_to_token_1013 = test_quote_accuracy "xtt_1013" 0.061tez 0n 0n 0.002623tez
let test_xtz_to_token_1014 = test_quote_accuracy "xtt_1014" 0.067tez 0n 0n 0.003149tez
let test_xtz_to_token_1015 = test_quote_accuracy "xtt_1015" 0.071tez 0n 0n 0.003799tez
let test_xtz_to_token_1016 = test_quote_accuracy "xtt_1016" 0.073tez 0n 0n 0.043069tez
let test_xtz_to_token_1017 = test_quote_accuracy "xtt_1017" 0.079tez 0n 0n 0.004819tez
let test_xtz_to_token_1018 = test_quote_accuracy "xtt_1018" 0.083tez 0n 0n 0.005561tez
let test_xtz_to_token_1019 = test_quote_accuracy "xtt_1019" 0.089tez 0n 0n 0.006399tez
let test_xtz_to_token_1020 = test_quote_accuracy "xtt_1020" 0.097tez 0n 0n 0.007081tez
let test_xtz_to_token_1021 = test_quote_accuracy "xtt_1021" 1.111tez 0n 0n 0.087769tez
let test_xtz_to_token_1022 = test_quote_accuracy "xtt_1022" 2.222tez 0n 0n 0.184426tez
let test_xtz_to_token_1023 = test_quote_accuracy "xtt_1023" 3.333tez 3333000n 3333000n 0.296637tez
let test_xtz_to_token_1024 = test_quote_accuracy "xtt_1024" 4.444tez 4444000n 4444000n 0.431068tez
let test_xtz_to_token_1025 = test_quote_accuracy "xtt_1025" 5.555tez 11110000n 11110000n 0.561055tez
let test_xtz_to_token_1026 = test_quote_accuracy "xtt_1026" 6.666tez 19998000n 19998000n 0.686598tez
let test_xtz_to_token_1027 = test_quote_accuracy "xtt_1027" 7.777tez 7777000n 7777000n 0.832139tez
let test_xtz_to_token_1028 = test_quote_accuracy "xtt_1028" 8.888tez 17776000n 17776000n 0.968792tez
let test_xtz_to_token_1029 = test_quote_accuracy "xtt_1029" 9.999tez 9999000n 9999000n 1.129887tez
let test_xtz_to_token_1030 = test_quote_accuracy "xtt_1030" 1.234tez 2468000n 2468000n 0.156718tez
let test_xtz_to_token_1031 = test_quote_accuracy "xtt_1031" 2.345tez 0n 0n 0.3071950tez
let test_xtz_to_token_1032 = test_quote_accuracy "xtt_1032" 3.456tez 3456000n 3456000n 0.473472tez
let test_xtz_to_token_1033 = test_quote_accuracy "xtt_1033" 4.567tez 9134000n 9134000n 0.634811tez
let test_xtz_to_token_1034 = test_quote_accuracy "xtt_1034" 5.678tez 5678000n 5678000n 0.84699tez
let test_xtz_to_token_1035 = test_quote_accuracy "xtt_1035" 6.789tez 0n 0n 1.025139tez
let test_xtz_to_token_1036 = test_quote_accuracy "xtt_1036" 7.891tez 0n 0n 1.238887tez
let test_xtz_to_token_1037 = test_quote_accuracy "xtt_1037" 8.912tez 0n 0n 1.452652tez
let test_xtz_to_token_1038 = test_quote_accuracy "xtt_1038" 9.123tez 0n 0n 1.523541tez
let test_xtz_to_token_1039 = test_quote_accuracy "xtt_1039" 0.314tez 0n 0n 0.099995tez
let test_xtz_to_token_1040 = test_quote_accuracy "xtt_1040" 1.414tez 0n 0n 0.253106tez
let test_xtz_to_token_1041 = test_quote_accuracy "xtt_1041" 2.718tez 0n 0n 0.002718tez
let test_xtz_to_token_1042 = test_quote_accuracy "xtt_1042" 3.141tez 0n 0n 0.009423tez
let test_xtz_to_token_1043 = test_quote_accuracy "xtt_1043" 1.618tez 0n 0n 0.113261tez
let test_xtz_to_token_1044 = test_quote_accuracy "xtt_1044" 2.236tez 0n 0n 0.024596tez
let test_xtz_to_token_1045 = test_quote_accuracy "xtt_1045" 1.732tez 1732000n 1732000n 0.029998tez
let test_xtz_to_token_1046 = test_quote_accuracy "xtt_1046" 2.449tez 2449000n 2449000n 0.041633tez
let test_xtz_to_token_1047 = test_quote_accuracy "xtt_1047" 12.345tez 24690000n 24690000n 0.234555tez
let test_xtz_to_token_1048 = test_quote_accuracy "xtt_1048" 23.456tez 70368000n 70368000n 0.539488tez
let test_xtz_to_token_1049 = test_quote_accuracy "xtt_1049" 34.567tez 34567000n 34567000n 1.002443tez
let test_xtz_to_token_1050 = test_quote_accuracy "xtt_1050" 45.678tez 91356000n 91356000n 1.416018tez
let test_xtz_to_token_1051 = test_quote_accuracy "xtt_1051" 56.789tez 56789000n 56789000n 2.101193tez
let test_xtz_to_token_1052 = test_quote_accuracy "xtt_1052" 67.891tez 135782000n 135782000n 2.783531tez
let test_xtz_to_token_1053 = test_quote_accuracy "xtt_1053" 78.912tez 0n 0n 3.393216tez
let test_xtz_to_token_1054 = test_quote_accuracy "xtt_1054" 89.123tez 89123000n 89123000n 4.188781tez
let test_xtz_to_token_1055 = test_quote_accuracy "xtt_1055" 11.111tez 22222000n 22222000n 0.588883tez
let test_xtz_to_token_1056 = test_quote_accuracy "xtt_1056" 22.222tez 22222000n 22222000n 1.311098tez
let test_xtz_to_token_1057 = test_quote_accuracy "xtt_1057" 33.333tez 0n 0n 2.033313tez
let test_xtz_to_token_1058 = test_quote_accuracy "xtt_1058" 44.444tez 0n 0n 2.977748tez
let test_xtz_to_token_1059 = test_quote_accuracy "xtt_1059" 55.555tez 0n 0n 3.949997tez
let test_xtz_to_token_1060 = test_quote_accuracy "xtt_1060" 66.666tez 0n 0n 4.866618tez
let test_xtz_to_token_1061 = test_quote_accuracy "xtt_1061" 77.777tez 0n 0n 6.144383tez
let test_xtz_to_token_1062 = test_quote_accuracy "xtt_1062" 88.888tez 0n 0n 7.377704tez
let test_xtz_to_token_1063 = test_quote_accuracy "xtt_1063" 13.579tez 0n 0n 1.208531tez
let test_xtz_to_token_1064 = test_quote_accuracy "xtt_1064" 24.68tez 0n 0n 2.39396tez
let test_xtz_to_token_1065 = test_quote_accuracy "xtt_1065" 35.791tez 0n 0n 3.614891tez
let test_xtz_to_token_1066 = test_quote_accuracy "xtt_1066" 46.802tez 0n 0n 4.820606tez
let test_xtz_to_token_1067 = test_quote_accuracy "xtt_1067" 57.913tez 57913000n 57913000n 6.196690tez
let test_xtz_to_token_1068 = test_quote_accuracy "xtt_1068" 68.024tez 68024000n 68024000n 7.414616tez
let test_xtz_to_token_1069 = test_quote_accuracy "xtt_1069" 79.135tez 158270000n 158270000n 8.942255tez
let test_xtz_to_token_1070 = test_quote_accuracy "xtt_1070" 80.246tez 240738000n 240738000n 10.191242tez
let test_xtz_to_token_1071 = test_quote_accuracy "xtt_1071" 0.123tez 123000n 123000n 0.016113tez
let test_xtz_to_token_1072 = test_quote_accuracy "xtt_1072" 0.234tez 468000n 468000n 0.032058tez
let test_xtz_to_token_1073 = test_quote_accuracy "xtt_1073" 0.345tez 345000n 345000n 0.047955tez
let test_xtz_to_token_1074 = test_quote_accuracy "xtt_1074" 0.456tez 912000n 912000n 0.067944tez
let test_xtz_to_token_1075 = test_quote_accuracy "xtt_1075" 0.567tez 0n 0n 0.085998tez
let test_xtz_to_token_1076 = test_quote_accuracy "xtt_1076" 0.678tez 678000n 678000n 0.106446tez
let test_xtz_to_token_1077 = test_quote_accuracy "xtt_1077" 0.789tez 1578000n 1578000n 0.128607tez
let test_xtz_to_token_1078 = test_quote_accuracy "xtt_1078" 0.891tez 891000n 891000n 0.148797tez
let test_xtz_to_token_1079 = test_quote_accuracy "xtt_1079" 1.001tez 0n 0n 0.173173tez
let test_xtz_to_token_1080 = test_quote_accuracy "xtt_1080" 2.002tez 0n 0n 0.358358tez
let test_xtz_to_token_1081 = test_quote_accuracy "xtt_1081" 3.003tez 0n 0n 0.003003tez
let test_xtz_to_token_1082 = test_quote_accuracy "xtt_1082" 4.004tez 0n 0n 0.012012tez
let test_xtz_to_token_1083 = test_quote_accuracy "xtt_1083" 5.005tez 0n 0n 0.035035tez
let test_xtz_to_token_1084 = test_quote_accuracy "xtt_1084" 6.006tez 0n 0n 0.066066tez
let test_xtz_to_token_1085 = test_quote_accuracy "xtt_1085" 7.007tez 0n 0n 0.091091tez
let test_xtz_to_token_1086 = test_quote_accuracy "xtt_1086" 8.008tez 0n 0n 0.136136tez
let test_xtz_to_token_1087 = test_quote_accuracy "xtt_1087" 17.17tez 0n 0n 0.32623tez
let test_xtz_to_token_1088 = test_quote_accuracy "xtt_1088" 19.19tez 0n 0n 0.44137tez
let test_xtz_to_token_1089 = test_quote_accuracy "xtt_1089" 23.23tez 23230000n 23230000n 0.67367tez
let test_xtz_to_token_1090 = test_quote_accuracy "xtt_1090" 29.29tez 29290000n 29290000n 0.90799tez
let test_xtz_to_token_1091 = test_quote_accuracy "xtt_1091" 31.31tez 62620000n 62620000n 1.158999tez
let test_xtz_to_token_1092 = test_quote_accuracy "xtt_1092" 37.37tez 112110000n 112110000n 1.53217tez
let test_xtz_to_token_1093 = test_quote_accuracy "xtt_1093" 41.41tez 41410000n 41410000n 1.780997tez
let test_xtz_to_token_1094 = test_quote_accuracy "xtt_1094" 43.43tez 86860000n 86860000n 2.04121tez
let test_xtz_to_token_1095 = test_quote_accuracy "xtt_1095" 0.999tez 999000n 999000n 0.052947tez
let test_xtz_to_token_1096 = test_quote_accuracy "xtt_1096" 1.999tez 3998000n 3998000n 0.117941tez
let test_xtz_to_token_1097 = test_quote_accuracy "xtt_1097" 2.999tez 0n 0n 0.182939tez
let test_xtz_to_token_1098 = test_quote_accuracy "xtt_1098" 3.999tez 3999000n 3999000n 0.267933tez
let test_xtz_to_token_1099 = test_quote_accuracy "xtt_1099" 4.999tez 9998000n 9998000n 0.354989tez
let test_xtz_to_token_1100 = test_quote_accuracy "xtt_1100" 5.999tez 5999000n 5999000n 0.437927tez
