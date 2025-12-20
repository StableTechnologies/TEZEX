#import "../contracts/lqt_fa12.mligo" "LQT"
#import "../contracts/dexter.mligo" "Dexter"
#import "./util.mligo" "Util"

module Test = Test.Next

module Tezos = Tezos.Next

(* Helper to test quote vs actual swap for token_to_xtz *)
let test_quote_token_to_tez_accuracy
  (test_name : string)
  (xtz_pool : tez)
  (token_pool : nat)
  (lqt_total : nat)
  (tokens_to_sell : nat)
: unit =
  let () = Test.State.reset 4n [10000tez; 10000tez; 10000tez; 10000tez] in
  let receiver = Test.Account.dan () in
  let (dex_orig, _, _) = Util.setup_custom_dex xtz_pool token_pool lqt_total in
  let dex_address = Test.Typed_address.to_address dex_orig.taddr in
  (* Get initial XTZ balance *)
  let initial_xtz_balance = Test.Address.get_balance receiver / 1mutez in
  // let () = Test.IO.log ("Initial XTZ balance: " ^ (Test.String.show initial_xtz_balance)) in
  (* Get quote *)
  let quote_result : nat option = Tezos.View.call "quote_token_to_tez" tokens_to_sell dex_address in
  match quote_result with
    None -> failwith (test_name ^ ": quote_token_to_tez view failed")
  | Some quoted_xtz ->
      (* Perform actual swap *)
      // let () = Test.IO.log ("Quoted XTZ: " ^ (Test.String.show quoted_xtz)) in
      let swap_param : Dexter.Dexter.token_to_xtz =
        {
         to_ = receiver;
         tokensSold = tokens_to_sell;
         minXtzBought = quoted_xtz * 1mutez;
         deadline = Util.future
        } in
      let _ : nat = Test.Typed_address.transfer_exn dex_orig.taddr (TokenToXtz swap_param) 0tez in
      (* Check actual XTZ received *)
      let final_xtz_balance = Test.Address.get_balance (receiver) / 1mutez in
      // let () = Test.IO.log ("Final XTZ balance: " ^ (Test.String.show final_xtz_balance)) in
      let xtz_received = final_xtz_balance - initial_xtz_balance in
      // let () = Test.IO.log ("XTZ quote: " ^ (Test.String.show quoted_xtz)) in
      let diff = abs (quoted_xtz - xtz_received) in
      // let () = Test.IO.log ("Difference: " ^ (Test.String.show diff)) in
      if diff > 0n
      then failwith (test_name ^ ": token_to_xtz quote differs from actual by more than 0")
      else ()

(*****************************************************************************)
(* Token to XTZ quote accuracy tests                                        *)
(*****************************************************************************)
let test_token_to_xtz_001 =
  test_quote_token_to_tez_accuracy "ttx_001" 1tez 1000000n 1000000n 100000n

let test_token_to_xtz_002 =
  test_quote_token_to_tez_accuracy "ttx_002" 1tez 1000000n 1000000n 200000n

let test_token_to_xtz_003 =
  test_quote_token_to_tez_accuracy "ttx_003" 2tez 2000000n 2000000n 100000n

let test_token_to_xtz_004 =
  test_quote_token_to_tez_accuracy "ttx_004" 2tez 2000000n 2000000n 200000n

let test_token_to_xtz_005 =
  test_quote_token_to_tez_accuracy "ttx_005" 3tez 3000000n 3000000n 150000n

let test_token_to_xtz_006 =
  test_quote_token_to_tez_accuracy "ttx_006" 3tez 3000000n 3000000n 300000n

let test_token_to_xtz_007 =
  test_quote_token_to_tez_accuracy "ttx_007" 5tez 5000000n 5000000n 250000n

let test_token_to_xtz_008 =
  test_quote_token_to_tez_accuracy "ttx_008" 5tez 5000000n 5000000n 500000n

let test_token_to_xtz_009 =
  test_quote_token_to_tez_accuracy "ttx_009" 10tez 10000000n 10000000n 500000n

let test_token_to_xtz_010 =
  test_quote_token_to_tez_accuracy "ttx_010" 10tez 10000000n 10000000n 1000000n

let test_token_to_xtz_011 = test_quote_token_to_tez_accuracy "ttx_011" 1tez 500000n 1000000n 50000n

let test_token_to_xtz_012 =
  test_quote_token_to_tez_accuracy "ttx_012" 1tez 2000000n 1000000n 200000n

let test_token_to_xtz_013 =
  test_quote_token_to_tez_accuracy "ttx_013" 2tez 1000000n 2000000n 100000n

let test_token_to_xtz_014 =
  test_quote_token_to_tez_accuracy "ttx_014" 2tez 4000000n 2000000n 400000n

let test_token_to_xtz_015 =
  test_quote_token_to_tez_accuracy "ttx_015" 3tez 1500000n 3000000n 150000n

let test_token_to_xtz_016 =
  test_quote_token_to_tez_accuracy "ttx_016" 3tez 6000000n 3000000n 600000n

let test_token_to_xtz_017 =
  test_quote_token_to_tez_accuracy "ttx_017" 5tez 2500000n 5000000n 250000n

let test_token_to_xtz_018 =
  test_quote_token_to_tez_accuracy "ttx_018" 5tez 10000000n 5000000n 1000000n

let test_token_to_xtz_019 =
  test_quote_token_to_tez_accuracy "ttx_019" 7tez 3500000n 7000000n 350000n

let test_token_to_xtz_020 =
  test_quote_token_to_tez_accuracy "ttx_020" 7tez 14000000n 7000000n 1400000n

let test_token_to_xtz_021 =
  test_quote_token_to_tez_accuracy "ttx_021" 1.5tez 1500000n 1500000n 150000n

let test_token_to_xtz_022 =
  test_quote_token_to_tez_accuracy "ttx_022" 2.5tez 2500000n 2500000n 250000n

let test_token_to_xtz_023 =
  test_quote_token_to_tez_accuracy "ttx_023" 3.5tez 3500000n 3500000n 350000n

let test_token_to_xtz_024 =
  test_quote_token_to_tez_accuracy "ttx_024" 4.5tez 4500000n 4500000n 450000n

let test_token_to_xtz_025 =
  test_quote_token_to_tez_accuracy "ttx_025" 6tez 6000000n 6000000n 600000n

let test_token_to_xtz_026 =
  test_quote_token_to_tez_accuracy "ttx_026" 7tez 7000000n 7000000n 700000n

let test_token_to_xtz_027 =
  test_quote_token_to_tez_accuracy "ttx_027" 8tez 8000000n 8000000n 800000n

let test_token_to_xtz_028 =
  test_quote_token_to_tez_accuracy "ttx_028" 9tez 9000000n 9000000n 900000n

let test_token_to_xtz_029 = test_quote_token_to_tez_accuracy "ttx_029" 1tez 750000n 1000000n 75000n

let test_token_to_xtz_030 =
  test_quote_token_to_tez_accuracy "ttx_030" 1tez 1250000n 1000000n 125000n

let test_token_to_xtz_031 =
  test_quote_token_to_tez_accuracy "ttx_031" 2tez 1500000n 2000000n 150000n

let test_token_to_xtz_032 =
  test_quote_token_to_tez_accuracy "ttx_032" 2tez 2500000n 2000000n 250000n

let test_token_to_xtz_033 =
  test_quote_token_to_tez_accuracy "ttx_033" 4tez 2000000n 4000000n 200000n

let test_token_to_xtz_034 =
  test_quote_token_to_tez_accuracy "ttx_034" 4tez 8000000n 4000000n 800000n

let test_token_to_xtz_035 =
  test_quote_token_to_tez_accuracy "ttx_035" 6tez 3000000n 6000000n 300000n

let test_token_to_xtz_036 =
  test_quote_token_to_tez_accuracy "ttx_036" 6tez 12000000n 6000000n 1200000n

let test_token_to_xtz_037 =
  test_quote_token_to_tez_accuracy "ttx_037" 8tez 4000000n 8000000n 400000n

let test_token_to_xtz_038 =
  test_quote_token_to_tez_accuracy "ttx_038" 8tez 16000000n 8000000n 1600000n

let test_token_to_xtz_039 = test_quote_token_to_tez_accuracy "ttx_039" 1tez 900000n 1000000n 90000n

let test_token_to_xtz_040 =
  test_quote_token_to_tez_accuracy "ttx_040" 1tez 1100000n 1000000n 110000n

let test_token_to_xtz_041 =
  test_quote_token_to_tez_accuracy "ttx_041" 11tez 11000000n 11000000n 1100000n

let test_token_to_xtz_042 =
  test_quote_token_to_tez_accuracy "ttx_042" 13tez 13000000n 13000000n 1300000n

let test_token_to_xtz_043 =
  test_quote_token_to_tez_accuracy "ttx_043" 17tez 17000000n 17000000n 1700000n

let test_token_to_xtz_044 =
  test_quote_token_to_tez_accuracy "ttx_044" 19tez 19000000n 19000000n 1900000n

let test_token_to_xtz_045 =
  test_quote_token_to_tez_accuracy "ttx_045" 23tez 23000000n 23000000n 2300000n

let test_token_to_xtz_046 =
  test_quote_token_to_tez_accuracy "ttx_046" 29tez 29000000n 29000000n 2900000n

let test_token_to_xtz_047 =
  test_quote_token_to_tez_accuracy "ttx_047" 31tez 31000000n 31000000n 3100000n

let test_token_to_xtz_048 =
  test_quote_token_to_tez_accuracy "ttx_048" 37tez 37000000n 37000000n 3700000n

let test_token_to_xtz_049 =
  test_quote_token_to_tez_accuracy "ttx_049" 41tez 41000000n 41000000n 4100000n

let test_token_to_xtz_050 =
  test_quote_token_to_tez_accuracy "ttx_050" 43tez 43000000n 43000000n 4300000n

let test_token_to_xtz_051 =
  test_quote_token_to_tez_accuracy "ttx_051" 47tez 47000000n 47000000n 4700000n

let test_token_to_xtz_052 =
  test_quote_token_to_tez_accuracy "ttx_052" 53tez 53000000n 53000000n 5300000n

let test_token_to_xtz_053 =
  test_quote_token_to_tez_accuracy "ttx_053" 59tez 59000000n 59000000n 5900000n

let test_token_to_xtz_054 =
  test_quote_token_to_tez_accuracy "ttx_054" 61tez 61000000n 61000000n 6100000n

let test_token_to_xtz_055 =
  test_quote_token_to_tez_accuracy "ttx_055" 67tez 67000000n 67000000n 6700000n

let test_token_to_xtz_056 =
  test_quote_token_to_tez_accuracy "ttx_056" 71tez 71000000n 71000000n 7100000n

let test_token_to_xtz_057 =
  test_quote_token_to_tez_accuracy "ttx_057" 73tez 73000000n 73000000n 7300000n

let test_token_to_xtz_058 =
  test_quote_token_to_tez_accuracy "ttx_058" 79tez 79000000n 79000000n 7900000n

let test_token_to_xtz_059 =
  test_quote_token_to_tez_accuracy "ttx_059" 83tez 83000000n 83000000n 8300000n

let test_token_to_xtz_060 =
  test_quote_token_to_tez_accuracy "ttx_060" 89tez 89000000n 89000000n 8900000n

let test_token_to_xtz_061 =
  test_quote_token_to_tez_accuracy "ttx_061" 97tez 97000000n 97000000n 9700000n

let test_token_to_xtz_062 =
  test_quote_token_to_tez_accuracy "ttx_062" 12tez 12000000n 12000000n 1200000n

let test_token_to_xtz_063 =
  test_quote_token_to_tez_accuracy "ttx_063" 14tez 14000000n 14000000n 1400000n

let test_token_to_xtz_064 =
  test_quote_token_to_tez_accuracy "ttx_064" 16tez 16000000n 16000000n 1600000n

let test_token_to_xtz_065 =
  test_quote_token_to_tez_accuracy "ttx_065" 18tez 18000000n 18000000n 1800000n

let test_token_to_xtz_066 =
  test_quote_token_to_tez_accuracy "ttx_066" 21tez 21000000n 21000000n 2100000n

let test_token_to_xtz_067 =
  test_quote_token_to_tez_accuracy "ttx_067" 24tez 24000000n 24000000n 2400000n

let test_token_to_xtz_068 =
  test_quote_token_to_tez_accuracy "ttx_068" 26tez 26000000n 26000000n 2600000n

let test_token_to_xtz_069 =
  test_quote_token_to_tez_accuracy "ttx_069" 27tez 27000000n 27000000n 2700000n

let test_token_to_xtz_070 =
  test_quote_token_to_tez_accuracy "ttx_070" 32tez 32000000n 32000000n 3200000n

let test_token_to_xtz_071 =
  test_quote_token_to_tez_accuracy "ttx_071" 33tez 33000000n 33000000n 3300000n

let test_token_to_xtz_072 =
  test_quote_token_to_tez_accuracy "ttx_072" 34tez 34000000n 34000000n 3400000n

let test_token_to_xtz_073 =
  test_quote_token_to_tez_accuracy "ttx_073" 36tez 36000000n 36000000n 3600000n

let test_token_to_xtz_074 =
  test_quote_token_to_tez_accuracy "ttx_074" 38tez 38000000n 38000000n 3800000n

let test_token_to_xtz_075 =
  test_quote_token_to_tez_accuracy "ttx_075" 39tez 39000000n 39000000n 3900000n

let test_token_to_xtz_076 =
  test_quote_token_to_tez_accuracy "ttx_076" 42tez 42000000n 42000000n 4200000n

let test_token_to_xtz_077 =
  test_quote_token_to_tez_accuracy "ttx_077" 44tez 44000000n 44000000n 4400000n

let test_token_to_xtz_078 =
  test_quote_token_to_tez_accuracy "ttx_078" 46tez 46000000n 46000000n 4600000n

let test_token_to_xtz_079 =
  test_quote_token_to_tez_accuracy "ttx_079" 48tez 48000000n 48000000n 4800000n

let test_token_to_xtz_080 =
  test_quote_token_to_tez_accuracy "ttx_080" 49tez 49000000n 49000000n 4900000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Medium Pools (50-500 tez) *)
(*****************************************************************************)
let test_token_to_xtz_081 =
  test_quote_token_to_tez_accuracy "ttx_081" 50tez 50000000n 50000000n 5000000n

let test_token_to_xtz_082 =
  test_quote_token_to_tez_accuracy "ttx_082" 100tez 100000000n 100000000n 10000000n

let test_token_to_xtz_083 =
  test_quote_token_to_tez_accuracy "ttx_083" 150tez 150000000n 150000000n 15000000n

let test_token_to_xtz_084 =
  test_quote_token_to_tez_accuracy "ttx_084" 200tez 200000000n 200000000n 20000000n

let test_token_to_xtz_085 =
  test_quote_token_to_tez_accuracy "ttx_085" 250tez 250000000n 250000000n 25000000n

let test_token_to_xtz_086 =
  test_quote_token_to_tez_accuracy "ttx_086" 300tez 300000000n 300000000n 30000000n

let test_token_to_xtz_087 =
  test_quote_token_to_tez_accuracy "ttx_087" 350tez 350000000n 350000000n 35000000n

let test_token_to_xtz_088 =
  test_quote_token_to_tez_accuracy "ttx_088" 400tez 400000000n 400000000n 40000000n

let test_token_to_xtz_089 =
  test_quote_token_to_tez_accuracy "ttx_089" 450tez 450000000n 450000000n 45000000n

let test_token_to_xtz_090 =
  test_quote_token_to_tez_accuracy "ttx_090" 500tez 500000000n 500000000n 50000000n

let test_token_to_xtz_091 =
  test_quote_token_to_tez_accuracy "ttx_091" 50tez 25000000n 50000000n 2500000n

let test_token_to_xtz_092 =
  test_quote_token_to_tez_accuracy "ttx_092" 100tez 50000000n 100000000n 5000000n

let test_token_to_xtz_093 =
  test_quote_token_to_tez_accuracy "ttx_093" 150tez 75000000n 150000000n 7500000n

let test_token_to_xtz_094 =
  test_quote_token_to_tez_accuracy "ttx_094" 200tez 100000000n 200000000n 10000000n

let test_token_to_xtz_095 =
  test_quote_token_to_tez_accuracy "ttx_095" 250tez 125000000n 250000000n 12500000n

let test_token_to_xtz_096 =
  test_quote_token_to_tez_accuracy "ttx_096" 300tez 150000000n 300000000n 15000000n

let test_token_to_xtz_097 =
  test_quote_token_to_tez_accuracy "ttx_097" 350tez 175000000n 350000000n 17500000n

let test_token_to_xtz_098 =
  test_quote_token_to_tez_accuracy "ttx_098" 400tez 200000000n 400000000n 20000000n

let test_token_to_xtz_099 =
  test_quote_token_to_tez_accuracy "ttx_099" 450tez 225000000n 450000000n 22500000n

let test_token_to_xtz_100 =
  test_quote_token_to_tez_accuracy "ttx_100" 500tez 250000000n 500000000n 25000000n

let test_token_to_xtz_101 =
  test_quote_token_to_tez_accuracy "ttx_101" 50tez 100000000n 50000000n 10000000n

let test_token_to_xtz_102 =
  test_quote_token_to_tez_accuracy "ttx_102" 100tez 200000000n 100000000n 20000000n

let test_token_to_xtz_103 =
  test_quote_token_to_tez_accuracy "ttx_103" 150tez 300000000n 150000000n 30000000n

let test_token_to_xtz_104 =
  test_quote_token_to_tez_accuracy "ttx_104" 200tez 400000000n 200000000n 40000000n

let test_token_to_xtz_105 =
  test_quote_token_to_tez_accuracy "ttx_105" 250tez 500000000n 250000000n 50000000n

let test_token_to_xtz_106 =
  test_quote_token_to_tez_accuracy "ttx_106" 300tez 600000000n 300000000n 60000000n

let test_token_to_xtz_107 =
  test_quote_token_to_tez_accuracy "ttx_107" 350tez 700000000n 350000000n 70000000n

let test_token_to_xtz_108 =
  test_quote_token_to_tez_accuracy "ttx_108" 400tez 800000000n 400000000n 80000000n

let test_token_to_xtz_109 =
  test_quote_token_to_tez_accuracy "ttx_109" 450tez 900000000n 450000000n 90000000n

let test_token_to_xtz_110 =
  test_quote_token_to_tez_accuracy "ttx_110" 500tez 1000000000n 500000000n 100000000n

let test_token_to_xtz_111 =
  test_quote_token_to_tez_accuracy "ttx_111" 75tez 75000000n 75000000n 7500000n

let test_token_to_xtz_112 =
  test_quote_token_to_tez_accuracy "ttx_112" 125tez 125000000n 125000000n 12500000n

let test_token_to_xtz_113 =
  test_quote_token_to_tez_accuracy "ttx_113" 175tez 175000000n 175000000n 17500000n

let test_token_to_xtz_114 =
  test_quote_token_to_tez_accuracy "ttx_114" 225tez 225000000n 225000000n 22500000n

let test_token_to_xtz_115 =
  test_quote_token_to_tez_accuracy "ttx_115" 275tez 275000000n 275000000n 27500000n

let test_token_to_xtz_116 =
  test_quote_token_to_tez_accuracy "ttx_116" 325tez 325000000n 325000000n 32500000n

let test_token_to_xtz_117 =
  test_quote_token_to_tez_accuracy "ttx_117" 375tez 375000000n 375000000n 37500000n

let test_token_to_xtz_118 =
  test_quote_token_to_tez_accuracy "ttx_118" 425tez 425000000n 425000000n 42500000n

let test_token_to_xtz_119 =
  test_quote_token_to_tez_accuracy "ttx_119" 475tez 475000000n 475000000n 47500000n

let test_token_to_xtz_120 =
  test_quote_token_to_tez_accuracy "ttx_120" 60tez 60000000n 60000000n 6000000n

let test_token_to_xtz_121 =
  test_quote_token_to_tez_accuracy "ttx_121" 70tez 70000000n 70000000n 7000000n

let test_token_to_xtz_122 =
  test_quote_token_to_tez_accuracy "ttx_122" 80tez 80000000n 80000000n 8000000n

let test_token_to_xtz_123 =
  test_quote_token_to_tez_accuracy "ttx_123" 90tez 90000000n 90000000n 9000000n

let test_token_to_xtz_124 =
  test_quote_token_to_tez_accuracy "ttx_124" 110tez 110000000n 110000000n 11000000n

let test_token_to_xtz_125 =
  test_quote_token_to_tez_accuracy "ttx_125" 120tez 120000000n 120000000n 12000000n

let test_token_to_xtz_126 =
  test_quote_token_to_tez_accuracy "ttx_126" 130tez 130000000n 130000000n 13000000n

let test_token_to_xtz_127 =
  test_quote_token_to_tez_accuracy "ttx_127" 140tez 140000000n 140000000n 14000000n

let test_token_to_xtz_128 =
  test_quote_token_to_tez_accuracy "ttx_128" 160tez 160000000n 160000000n 16000000n

let test_token_to_xtz_129 =
  test_quote_token_to_tez_accuracy "ttx_129" 170tez 170000000n 170000000n 17000000n

let test_token_to_xtz_130 =
  test_quote_token_to_tez_accuracy "ttx_130" 180tez 180000000n 180000000n 18000000n

let test_token_to_xtz_131 =
  test_quote_token_to_tez_accuracy "ttx_131" 190tez 190000000n 190000000n 19000000n

let test_token_to_xtz_132 =
  test_quote_token_to_tez_accuracy "ttx_132" 210tez 210000000n 210000000n 21000000n

let test_token_to_xtz_133 =
  test_quote_token_to_tez_accuracy "ttx_133" 220tez 220000000n 220000000n 22000000n

let test_token_to_xtz_134 =
  test_quote_token_to_tez_accuracy "ttx_134" 230tez 230000000n 230000000n 23000000n

let test_token_to_xtz_135 =
  test_quote_token_to_tez_accuracy "ttx_135" 240tez 240000000n 240000000n 24000000n

let test_token_to_xtz_136 =
  test_quote_token_to_tez_accuracy "ttx_136" 260tez 260000000n 260000000n 26000000n

let test_token_to_xtz_137 =
  test_quote_token_to_tez_accuracy "ttx_137" 270tez 270000000n 270000000n 27000000n

let test_token_to_xtz_138 =
  test_quote_token_to_tez_accuracy "ttx_138" 280tez 280000000n 280000000n 28000000n

let test_token_to_xtz_139 =
  test_quote_token_to_tez_accuracy "ttx_139" 290tez 290000000n 290000000n 29000000n

let test_token_to_xtz_140 =
  test_quote_token_to_tez_accuracy "ttx_140" 310tez 310000000n 310000000n 31000000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Large Pools (500-2000 tez) *)
(*****************************************************************************)
let test_token_to_xtz_141 =
  test_quote_token_to_tez_accuracy "ttx_141" 600tez 600000000n 600000000n 60000000n

let test_token_to_xtz_142 =
  test_quote_token_to_tez_accuracy "ttx_142" 700tez 700000000n 700000000n 70000000n

let test_token_to_xtz_143 =
  test_quote_token_to_tez_accuracy "ttx_143" 800tez 800000000n 800000000n 80000000n

let test_token_to_xtz_144 =
  test_quote_token_to_tez_accuracy "ttx_144" 900tez 900000000n 900000000n 90000000n

let test_token_to_xtz_145 =
  test_quote_token_to_tez_accuracy "ttx_145" 1000tez 1000000000n 1000000000n 100000000n

let test_token_to_xtz_146 =
  test_quote_token_to_tez_accuracy "ttx_146" 1100tez 1100000000n 1100000000n 110000000n

let test_token_to_xtz_147 =
  test_quote_token_to_tez_accuracy "ttx_147" 1200tez 1200000000n 1200000000n 120000000n

let test_token_to_xtz_148 =
  test_quote_token_to_tez_accuracy "ttx_148" 1300tez 1300000000n 1300000000n 130000000n

let test_token_to_xtz_149 =
  test_quote_token_to_tez_accuracy "ttx_149" 1400tez 1400000000n 1400000000n 140000000n

let test_token_to_xtz_150 =
  test_quote_token_to_tez_accuracy "ttx_150" 1500tez 1500000000n 1500000000n 150000000n

let test_token_to_xtz_151 =
  test_quote_token_to_tez_accuracy "ttx_151" 1600tez 1600000000n 1600000000n 160000000n

let test_token_to_xtz_152 =
  test_quote_token_to_tez_accuracy "ttx_152" 1700tez 1700000000n 1700000000n 170000000n

let test_token_to_xtz_153 =
  test_quote_token_to_tez_accuracy "ttx_153" 1800tez 1800000000n 1800000000n 180000000n

let test_token_to_xtz_154 =
  test_quote_token_to_tez_accuracy "ttx_154" 1900tez 1900000000n 1900000000n 190000000n

let test_token_to_xtz_155 =
  test_quote_token_to_tez_accuracy "ttx_155" 2000tez 2000000000n 2000000000n 200000000n

let test_token_to_xtz_156 =
  test_quote_token_to_tez_accuracy "ttx_156" 600tez 300000000n 600000000n 30000000n

let test_token_to_xtz_157 =
  test_quote_token_to_tez_accuracy "ttx_157" 700tez 350000000n 700000000n 35000000n

let test_token_to_xtz_158 =
  test_quote_token_to_tez_accuracy "ttx_158" 800tez 400000000n 800000000n 40000000n

let test_token_to_xtz_159 =
  test_quote_token_to_tez_accuracy "ttx_159" 900tez 450000000n 900000000n 45000000n

let test_token_to_xtz_160 =
  test_quote_token_to_tez_accuracy "ttx_160" 1000tez 500000000n 1000000000n 50000000n

let test_token_to_xtz_161 =
  test_quote_token_to_tez_accuracy "ttx_161" 1100tez 550000000n 1100000000n 55000000n

let test_token_to_xtz_162 =
  test_quote_token_to_tez_accuracy "ttx_162" 1200tez 600000000n 1200000000n 60000000n

let test_token_to_xtz_163 =
  test_quote_token_to_tez_accuracy "ttx_163" 1300tez 650000000n 1300000000n 65000000n

let test_token_to_xtz_164 =
  test_quote_token_to_tez_accuracy "ttx_164" 1400tez 700000000n 1400000000n 70000000n

let test_token_to_xtz_165 =
  test_quote_token_to_tez_accuracy "ttx_165" 1500tez 750000000n 1500000000n 75000000n

let test_token_to_xtz_166 =
  test_quote_token_to_tez_accuracy "ttx_166" 600tez 1200000000n 600000000n 120000000n

let test_token_to_xtz_167 =
  test_quote_token_to_tez_accuracy "ttx_167" 700tez 1400000000n 700000000n 140000000n

let test_token_to_xtz_168 =
  test_quote_token_to_tez_accuracy "ttx_168" 800tez 1600000000n 800000000n 160000000n

let test_token_to_xtz_169 =
  test_quote_token_to_tez_accuracy "ttx_169" 900tez 1800000000n 900000000n 180000000n

let test_token_to_xtz_170 =
  test_quote_token_to_tez_accuracy "ttx_170" 1000tez 2000000000n 1000000000n 200000000n

let test_token_to_xtz_171 =
  test_quote_token_to_tez_accuracy "ttx_171" 1100tez 2200000000n 1100000000n 220000000n

let test_token_to_xtz_172 =
  test_quote_token_to_tez_accuracy "ttx_172" 1200tez 2400000000n 1200000000n 240000000n

let test_token_to_xtz_173 =
  test_quote_token_to_tez_accuracy "ttx_173" 1300tez 2600000000n 1300000000n 260000000n

let test_token_to_xtz_174 =
  test_quote_token_to_tez_accuracy "ttx_174" 1400tez 2800000000n 1400000000n 280000000n

let test_token_to_xtz_175 =
  test_quote_token_to_tez_accuracy "ttx_175" 1500tez 3000000000n 1500000000n 300000000n

let test_token_to_xtz_176 =
  test_quote_token_to_tez_accuracy "ttx_176" 550tez 550000000n 550000000n 55000000n

let test_token_to_xtz_177 =
  test_quote_token_to_tez_accuracy "ttx_177" 650tez 650000000n 650000000n 65000000n

let test_token_to_xtz_178 =
  test_quote_token_to_tez_accuracy "ttx_178" 750tez 750000000n 750000000n 75000000n

let test_token_to_xtz_179 =
  test_quote_token_to_tez_accuracy "ttx_179" 850tez 850000000n 850000000n 85000000n

let test_token_to_xtz_180 =
  test_quote_token_to_tez_accuracy "ttx_180" 950tez 950000000n 950000000n 95000000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Very Large Pools (2000+ tez) *)
(*****************************************************************************)
let test_token_to_xtz_181 =
  test_quote_token_to_tez_accuracy "ttx_181" 2500tez 2500000000n 2500000000n 250000000n

let test_token_to_xtz_182 =
  test_quote_token_to_tez_accuracy "ttx_182" 3000tez 3000000000n 3000000000n 300000000n

let test_token_to_xtz_183 =
  test_quote_token_to_tez_accuracy "ttx_183" 3500tez 3500000000n 3500000000n 350000000n

let test_token_to_xtz_184 =
  test_quote_token_to_tez_accuracy "ttx_184" 4000tez 4000000000n 4000000000n 400000000n

let test_token_to_xtz_185 =
  test_quote_token_to_tez_accuracy "ttx_185" 4500tez 4500000000n 4500000000n 450000000n

let test_token_to_xtz_186 =
  test_quote_token_to_tez_accuracy "ttx_186" 5000tez 5000000000n 5000000000n 500000000n

let test_token_to_xtz_187 =
  test_quote_token_to_tez_accuracy "ttx_187" 2500tez 1250000000n 2500000000n 125000000n

let test_token_to_xtz_188 =
  test_quote_token_to_tez_accuracy "ttx_188" 3000tez 1500000000n 3000000000n 150000000n

let test_token_to_xtz_189 =
  test_quote_token_to_tez_accuracy "ttx_189" 3500tez 1750000000n 3500000000n 175000000n

let test_token_to_xtz_190 =
  test_quote_token_to_tez_accuracy "ttx_190" 4000tez 2000000000n 4000000000n 200000000n

let test_token_to_xtz_191 =
  test_quote_token_to_tez_accuracy "ttx_191" 4500tez 2250000000n 4500000000n 225000000n

let test_token_to_xtz_192 =
  test_quote_token_to_tez_accuracy "ttx_192" 5000tez 2500000000n 5000000000n 250000000n

let test_token_to_xtz_193 =
  test_quote_token_to_tez_accuracy "ttx_193" 2500tez 5000000000n 2500000000n 500000000n

let test_token_to_xtz_194 =
  test_quote_token_to_tez_accuracy "ttx_194" 3000tez 6000000000n 3000000000n 600000000n

let test_token_to_xtz_195 =
  test_quote_token_to_tez_accuracy "ttx_195" 3500tez 7000000000n 3500000000n 700000000n

let test_token_to_xtz_196 =
  test_quote_token_to_tez_accuracy "ttx_196" 4000tez 8000000000n 4000000000n 800000000n

let test_token_to_xtz_197 =
  test_quote_token_to_tez_accuracy "ttx_197" 4500tez 9000000000n 4500000000n 900000000n

let test_token_to_xtz_198 =
  test_quote_token_to_tez_accuracy "ttx_198" 5000tez 10000000000n 5000000000n 1000000000n

let test_token_to_xtz_199 =
  test_quote_token_to_tez_accuracy "ttx_199" 2250tez 2250000000n 2250000000n 225000000n

let test_token_to_xtz_200 =
  test_quote_token_to_tez_accuracy "ttx_200" 2750tez 2750000000n 2750000000n 275000000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Tiny Swaps *)
(*****************************************************************************)
let test_token_to_xtz_201 =
  test_quote_token_to_tez_accuracy "ttx_201" 100tez 100000000n 100000000n 1000n

let test_token_to_xtz_202 =
  test_quote_token_to_tez_accuracy "ttx_202" 100tez 100000000n 100000000n 5000n

let test_token_to_xtz_203 =
  test_quote_token_to_tez_accuracy "ttx_203" 100tez 100000000n 100000000n 10000n

let test_token_to_xtz_204 =
  test_quote_token_to_tez_accuracy "ttx_204" 200tez 200000000n 200000000n 1000n

let test_token_to_xtz_205 =
  test_quote_token_to_tez_accuracy "ttx_205" 200tez 200000000n 200000000n 5000n

let test_token_to_xtz_206 =
  test_quote_token_to_tez_accuracy "ttx_206" 200tez 200000000n 200000000n 10000n

let test_token_to_xtz_207 =
  test_quote_token_to_tez_accuracy "ttx_207" 500tez 500000000n 500000000n 1000n

let test_token_to_xtz_208 =
  test_quote_token_to_tez_accuracy "ttx_208" 500tez 500000000n 500000000n 5000n

let test_token_to_xtz_209 =
  test_quote_token_to_tez_accuracy "ttx_209" 500tez 500000000n 500000000n 10000n

let test_token_to_xtz_210 =
  test_quote_token_to_tez_accuracy "ttx_210" 1000tez 1000000000n 1000000000n 1000n

let test_token_to_xtz_211 =
  test_quote_token_to_tez_accuracy "ttx_211" 1000tez 1000000000n 1000000000n 5000n

let test_token_to_xtz_212 =
  test_quote_token_to_tez_accuracy "ttx_212" 1000tez 1000000000n 1000000000n 10000n

let test_token_to_xtz_213 =
  test_quote_token_to_tez_accuracy "ttx_213" 50tez 50000000n 50000000n 500n

let test_token_to_xtz_214 =
  test_quote_token_to_tez_accuracy "ttx_214" 50tez 50000000n 50000000n 2500n

let test_token_to_xtz_215 =
  test_quote_token_to_tez_accuracy "ttx_215" 50tez 50000000n 50000000n 5000n

let test_token_to_xtz_216 =
  test_quote_token_to_tez_accuracy "ttx_216" 1000tez 1000000000n 1000000000n 50000n

let test_token_to_xtz_217 =
  test_quote_token_to_tez_accuracy "ttx_217" 1000tez 1000000000n 1000000000n 100000n

let test_token_to_xtz_218 =
  test_quote_token_to_tez_accuracy "ttx_218" 500tez 500000000n 500000000n 25000n

let test_token_to_xtz_219 =
  test_quote_token_to_tez_accuracy "ttx_219" 500tez 500000000n 500000000n 50000n

let test_token_to_xtz_220 =
  test_quote_token_to_tez_accuracy "ttx_220" 250tez 250000000n 250000000n 12500n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Extreme Imbalances *)
(*****************************************************************************)
let test_token_to_xtz_221 =
  test_quote_token_to_tez_accuracy "ttx_221" 1000tez 100000n 5000000n 10000n

let test_token_to_xtz_222 =
  test_quote_token_to_tez_accuracy "ttx_222" 1000tez 200000n 5000000n 20000n

let test_token_to_xtz_223 =
  test_quote_token_to_tez_accuracy "ttx_223" 1000tez 500000n 5000000n 50000n

let test_token_to_xtz_224 =
  test_quote_token_to_tez_accuracy "ttx_224" 100tez 10000000n 5000000n 1000000n

let test_token_to_xtz_225 =
  test_quote_token_to_tez_accuracy "ttx_225" 100tez 20000000n 5000000n 2000000n

let test_token_to_xtz_226 =
  test_quote_token_to_tez_accuracy "ttx_226" 100tez 50000000n 5000000n 5000000n

let test_token_to_xtz_227 =
  test_quote_token_to_tez_accuracy "ttx_227" 10tez 100000000n 10000000n 10000000n

let test_token_to_xtz_228 =
  test_quote_token_to_tez_accuracy "ttx_228" 10tez 200000000n 10000000n 20000000n

let test_token_to_xtz_229 =
  test_quote_token_to_tez_accuracy "ttx_229" 10tez 500000000n 10000000n 50000000n

let test_token_to_xtz_230 =
  test_quote_token_to_tez_accuracy "ttx_230" 1tez 10000000n 1000000n 1000000n

let test_token_to_xtz_231 =
  test_quote_token_to_tez_accuracy "ttx_231" 1tez 20000000n 1000000n 2000000n

let test_token_to_xtz_232 =
  test_quote_token_to_tez_accuracy "ttx_232" 1tez 50000000n 1000000n 5000000n

let test_token_to_xtz_233 = test_quote_token_to_tez_accuracy "ttx_233" 500tez 50000n 2500000n 5000n

let test_token_to_xtz_234 = test_quote_token_to_tez_accuracy "ttx_234" 500tez 25000n 2500000n 2500n

let test_token_to_xtz_235 =
  test_quote_token_to_tez_accuracy "ttx_235" 50tez 5000000n 2500000n 500000n

let test_token_to_xtz_236 =
  test_quote_token_to_tez_accuracy "ttx_236" 50tez 10000000n 2500000n 1000000n

let test_token_to_xtz_237 =
  test_quote_token_to_tez_accuracy "ttx_237" 5tez 50000000n 2500000n 5000000n

let test_token_to_xtz_238 =
  test_quote_token_to_tez_accuracy "ttx_238" 5tez 100000000n 2500000n 10000000n

let test_token_to_xtz_239 =
  test_quote_token_to_tez_accuracy "ttx_239" 2000tez 1000000n 10000000n 100000n

let test_token_to_xtz_240 =
  test_quote_token_to_tez_accuracy "ttx_240" 200tez 10000000n 10000000n 1000000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Odd Numbers and Edge Cases *)
(*****************************************************************************)
let test_token_to_xtz_241 =
  test_quote_token_to_tez_accuracy "ttx_241" 1.111tez 1111111n 1111111n 111111n

let test_token_to_xtz_242 =
  test_quote_token_to_tez_accuracy "ttx_242" 2.222tez 2222222n 2222222n 222222n

let test_token_to_xtz_243 =
  test_quote_token_to_tez_accuracy "ttx_243" 3.333tez 3333333n 3333333n 333333n

let test_token_to_xtz_244 =
  test_quote_token_to_tez_accuracy "ttx_244" 4.444tez 4444444n 4444444n 444444n

let test_token_to_xtz_245 =
  test_quote_token_to_tez_accuracy "ttx_245" 5.555tez 5555555n 5555555n 555555n

let test_token_to_xtz_246 =
  test_quote_token_to_tez_accuracy "ttx_246" 6.666tez 6666666n 6666666n 666666n

let test_token_to_xtz_247 =
  test_quote_token_to_tez_accuracy "ttx_247" 7.777tez 7777777n 7777777n 777777n

let test_token_to_xtz_248 =
  test_quote_token_to_tez_accuracy "ttx_248" 8.888tez 8888888n 8888888n 888888n

let test_token_to_xtz_249 =
  test_quote_token_to_tez_accuracy "ttx_249" 9.999tez 9999999n 9999999n 999999n

let test_token_to_xtz_250 =
  test_quote_token_to_tez_accuracy "ttx_250" 1.234tez 1234567n 1234567n 123456n

let test_token_to_xtz_251 =
  test_quote_token_to_tez_accuracy "ttx_251" 2.345tez 2345678n 2345678n 234567n

let test_token_to_xtz_252 =
  test_quote_token_to_tez_accuracy "ttx_252" 3.456tez 3456789n 3456789n 345678n

let test_token_to_xtz_253 =
  test_quote_token_to_tez_accuracy "ttx_253" 4.567tez 4567890n 4567890n 456789n

let test_token_to_xtz_254 =
  test_quote_token_to_tez_accuracy "ttx_254" 5.678tez 5678901n 5678901n 567890n

let test_token_to_xtz_255 =
  test_quote_token_to_tez_accuracy "ttx_255" 6.789tez 6789012n 6789012n 678901n

let test_token_to_xtz_256 =
  test_quote_token_to_tez_accuracy "ttx_256" 7.89tez 7890123n 7890123n 789012n

let test_token_to_xtz_257 =
  test_quote_token_to_tez_accuracy "ttx_257" 0.123tez 123456n 123456n 12345n

let test_token_to_xtz_258 =
  test_quote_token_to_tez_accuracy "ttx_258" 0.456tez 456789n 456789n 45678n

let test_token_to_xtz_259 =
  test_quote_token_to_tez_accuracy "ttx_259" 0.789tez 789012n 789012n 78901n

let test_token_to_xtz_260 =
  test_quote_token_to_tez_accuracy "ttx_260" 1.357tez 1357924n 1357924n 135792n

(*****************************************************************************)
(* Token to XTZ Quote Tests - Additional Tests (Batch 261-560)               *)
(*****************************************************************************)
let test_token_to_xtz_261 =
  test_quote_token_to_tez_accuracy "ttx_261" 620tez 310000000n 620000000n 62000000n

let test_token_to_xtz_262 =
  test_quote_token_to_tez_accuracy "ttx_262" 630tez 1260000000n 630000000n 63000000n

let test_token_to_xtz_263 =
  test_quote_token_to_tez_accuracy "ttx_263" 640tez 640000000n 640000000n 64000000n

let test_token_to_xtz_264 =
  test_quote_token_to_tez_accuracy "ttx_264" 650tez 325000000n 650000000n 65000000n

let test_token_to_xtz_265 =
  test_quote_token_to_tez_accuracy "ttx_265" 660tez 1320000000n 660000000n 66000000n

let test_token_to_xtz_266 =
  test_quote_token_to_tez_accuracy "ttx_266" 670tez 670000000n 670000000n 134000000n

let test_token_to_xtz_267 =
  test_quote_token_to_tez_accuracy "ttx_267" 680tez 340000000n 680000000n 68000000n

let test_token_to_xtz_268 =
  test_quote_token_to_tez_accuracy "ttx_268" 690tez 1380000000n 690000000n 69000000n

let test_token_to_xtz_269 =
  test_quote_token_to_tez_accuracy "ttx_269" 700tez 700000000n 700000000n 70000000n

let test_token_to_xtz_270 =
  test_quote_token_to_tez_accuracy "ttx_270" 710tez 355000000n 710000000n 17750000n

let test_token_to_xtz_271 =
  test_quote_token_to_tez_accuracy "ttx_271" 720tez 1440000000n 720000000n 288000000n

let test_token_to_xtz_272 =
  test_quote_token_to_tez_accuracy "ttx_272" 730tez 730000000n 730000000n 73000000n

let test_token_to_xtz_273 =
  test_quote_token_to_tez_accuracy "ttx_273" 740tez 370000000n 740000000n 74000000n

let test_token_to_xtz_274 =
  test_quote_token_to_tez_accuracy "ttx_274" 750tez 1500000000n 750000000n 75000000n

let test_token_to_xtz_275 =
  test_quote_token_to_tez_accuracy "ttx_275" 760tez 760000000n 760000000n 38000000n

let test_token_to_xtz_276 =
  test_quote_token_to_tez_accuracy "ttx_276" 770tez 385000000n 770000000n 77000000n

let test_token_to_xtz_277 =
  test_quote_token_to_tez_accuracy "ttx_277" 780tez 1560000000n 780000000n 78000000n

let test_token_to_xtz_278 =
  test_quote_token_to_tez_accuracy "ttx_278" 790tez 790000000n 790000000n 79000000n

let test_token_to_xtz_279 =
  test_quote_token_to_tez_accuracy "ttx_279" 800tez 400000000n 800000000n 80000000n

let test_token_to_xtz_280 =
  test_quote_token_to_tez_accuracy "ttx_280" 810tez 1620000000n 810000000n 81000000n

let test_token_to_xtz_281 =
  test_quote_token_to_tez_accuracy "ttx_281" 820tez 820000000n 820000000n 164000000n

let test_token_to_xtz_282 =
  test_quote_token_to_tez_accuracy "ttx_282" 830tez 415000000n 830000000n 83000000n

let test_token_to_xtz_283 =
  test_quote_token_to_tez_accuracy "ttx_283" 840tez 1680000000n 840000000n 84000000n

let test_token_to_xtz_284 =
  test_quote_token_to_tez_accuracy "ttx_284" 850tez 850000000n 850000000n 85000000n

let test_token_to_xtz_285 =
  test_quote_token_to_tez_accuracy "ttx_285" 860tez 430000000n 860000000n 21500000n

let test_token_to_xtz_286 =
  test_quote_token_to_tez_accuracy "ttx_286" 870tez 1740000000n 870000000n 348000000n

let test_token_to_xtz_287 =
  test_quote_token_to_tez_accuracy "ttx_287" 880tez 880000000n 880000000n 88000000n

let test_token_to_xtz_288 =
  test_quote_token_to_tez_accuracy "ttx_288" 890tez 445000000n 890000000n 89000000n

let test_token_to_xtz_289 =
  test_quote_token_to_tez_accuracy "ttx_289" 900tez 1800000000n 900000000n 90000000n

let test_token_to_xtz_290 =
  test_quote_token_to_tez_accuracy "ttx_290" 910tez 910000000n 910000000n 45500000n

let test_token_to_xtz_291 =
  test_quote_token_to_tez_accuracy "ttx_291" 920tez 460000000n 920000000n 92000000n

let test_token_to_xtz_292 =
  test_quote_token_to_tez_accuracy "ttx_292" 930tez 1860000000n 930000000n 93000000n

let test_token_to_xtz_293 =
  test_quote_token_to_tez_accuracy "ttx_293" 940tez 940000000n 940000000n 94000000n

let test_token_to_xtz_294 =
  test_quote_token_to_tez_accuracy "ttx_294" 950tez 475000000n 950000000n 95000000n

let test_token_to_xtz_295 =
  test_quote_token_to_tez_accuracy "ttx_295" 960tez 1920000000n 960000000n 96000000n

let test_token_to_xtz_296 =
  test_quote_token_to_tez_accuracy "ttx_296" 970tez 970000000n 970000000n 194000000n

let test_token_to_xtz_297 =
  test_quote_token_to_tez_accuracy "ttx_297" 980tez 490000000n 980000000n 98000000n

let test_token_to_xtz_298 =
  test_quote_token_to_tez_accuracy "ttx_298" 990tez 1980000000n 990000000n 99000000n

let test_token_to_xtz_299 =
  test_quote_token_to_tez_accuracy "ttx_299" 1000tez 1000000000n 1000000000n 100000000n

let test_token_to_xtz_300 =
  test_quote_token_to_tez_accuracy "ttx_300" 10tez 5000000n 10000000n 250000n

let test_token_to_xtz_301 =
  test_quote_token_to_tez_accuracy "ttx_301" 20tez 40000000n 20000000n 8000000n

let test_token_to_xtz_302 =
  test_quote_token_to_tez_accuracy "ttx_302" 30tez 30000000n 30000000n 3000000n

let test_token_to_xtz_303 =
  test_quote_token_to_tez_accuracy "ttx_303" 40tez 20000000n 40000000n 4000000n

let test_token_to_xtz_304 =
  test_quote_token_to_tez_accuracy "ttx_304" 50tez 100000000n 50000000n 5000000n

let test_token_to_xtz_305 =
  test_quote_token_to_tez_accuracy "ttx_305" 60tez 60000000n 60000000n 3000000n

let test_token_to_xtz_306 =
  test_quote_token_to_tez_accuracy "ttx_306" 70tez 35000000n 70000000n 7000000n

let test_token_to_xtz_307 =
  test_quote_token_to_tez_accuracy "ttx_307" 80tez 160000000n 80000000n 8000000n

let test_token_to_xtz_308 =
  test_quote_token_to_tez_accuracy "ttx_308" 90tez 90000000n 90000000n 9000000n

let test_token_to_xtz_309 =
  test_quote_token_to_tez_accuracy "ttx_309" 100tez 50000000n 100000000n 10000000n

let test_token_to_xtz_310 =
  test_quote_token_to_tez_accuracy "ttx_310" 110tez 220000000n 110000000n 11000000n

let test_token_to_xtz_311 =
  test_quote_token_to_tez_accuracy "ttx_311" 120tez 120000000n 120000000n 24000000n

let test_token_to_xtz_312 =
  test_quote_token_to_tez_accuracy "ttx_312" 130tez 65000000n 130000000n 13000000n

let test_token_to_xtz_313 =
  test_quote_token_to_tez_accuracy "ttx_313" 140tez 280000000n 140000000n 14000000n

let test_token_to_xtz_314 =
  test_quote_token_to_tez_accuracy "ttx_314" 150tez 150000000n 150000000n 15000000n

let test_token_to_xtz_315 =
  test_quote_token_to_tez_accuracy "ttx_315" 160tez 80000000n 160000000n 4000000n

let test_token_to_xtz_316 =
  test_quote_token_to_tez_accuracy "ttx_316" 170tez 340000000n 170000000n 68000000n

let test_token_to_xtz_317 =
  test_quote_token_to_tez_accuracy "ttx_317" 180tez 180000000n 180000000n 18000000n

let test_token_to_xtz_318 =
  test_quote_token_to_tez_accuracy "ttx_318" 190tez 95000000n 190000000n 19000000n

let test_token_to_xtz_319 =
  test_quote_token_to_tez_accuracy "ttx_319" 200tez 400000000n 200000000n 20000000n

let test_token_to_xtz_320 =
  test_quote_token_to_tez_accuracy "ttx_320" 210tez 210000000n 210000000n 10500000n

let test_token_to_xtz_321 =
  test_quote_token_to_tez_accuracy "ttx_321" 220tez 110000000n 220000000n 22000000n

let test_token_to_xtz_322 =
  test_quote_token_to_tez_accuracy "ttx_322" 230tez 460000000n 230000000n 23000000n

let test_token_to_xtz_323 =
  test_quote_token_to_tez_accuracy "ttx_323" 240tez 240000000n 240000000n 24000000n

let test_token_to_xtz_324 =
  test_quote_token_to_tez_accuracy "ttx_324" 250tez 125000000n 250000000n 25000000n

let test_token_to_xtz_325 =
  test_quote_token_to_tez_accuracy "ttx_325" 260tez 520000000n 260000000n 26000000n

let test_token_to_xtz_326 =
  test_quote_token_to_tez_accuracy "ttx_326" 270tez 270000000n 270000000n 54000000n

let test_token_to_xtz_327 =
  test_quote_token_to_tez_accuracy "ttx_327" 280tez 140000000n 280000000n 28000000n

let test_token_to_xtz_328 =
  test_quote_token_to_tez_accuracy "ttx_328" 290tez 580000000n 290000000n 29000000n

let test_token_to_xtz_329 =
  test_quote_token_to_tez_accuracy "ttx_329" 300tez 300000000n 300000000n 30000000n

let test_token_to_xtz_330 =
  test_quote_token_to_tez_accuracy "ttx_330" 310tez 155000000n 310000000n 7750000n

let test_token_to_xtz_331 =
  test_quote_token_to_tez_accuracy "ttx_331" 320tez 640000000n 320000000n 128000000n

let test_token_to_xtz_332 =
  test_quote_token_to_tez_accuracy "ttx_332" 330tez 330000000n 330000000n 33000000n

let test_token_to_xtz_333 =
  test_quote_token_to_tez_accuracy "ttx_333" 340tez 170000000n 340000000n 34000000n

let test_token_to_xtz_334 =
  test_quote_token_to_tez_accuracy "ttx_334" 350tez 700000000n 350000000n 35000000n

let test_token_to_xtz_335 =
  test_quote_token_to_tez_accuracy "ttx_335" 360tez 360000000n 360000000n 18000000n

let test_token_to_xtz_336 =
  test_quote_token_to_tez_accuracy "ttx_336" 370tez 185000000n 370000000n 37000000n

let test_token_to_xtz_337 =
  test_quote_token_to_tez_accuracy "ttx_337" 380tez 760000000n 380000000n 38000000n

let test_token_to_xtz_338 =
  test_quote_token_to_tez_accuracy "ttx_338" 390tez 390000000n 390000000n 39000000n

let test_token_to_xtz_339 =
  test_quote_token_to_tez_accuracy "ttx_339" 400tez 200000000n 400000000n 40000000n

let test_token_to_xtz_340 =
  test_quote_token_to_tez_accuracy "ttx_340" 410tez 820000000n 410000000n 41000000n

let test_token_to_xtz_341 =
  test_quote_token_to_tez_accuracy "ttx_341" 420tez 420000000n 420000000n 84000000n

let test_token_to_xtz_342 =
  test_quote_token_to_tez_accuracy "ttx_342" 430tez 215000000n 430000000n 43000000n

let test_token_to_xtz_343 =
  test_quote_token_to_tez_accuracy "ttx_343" 440tez 880000000n 440000000n 44000000n

let test_token_to_xtz_344 =
  test_quote_token_to_tez_accuracy "ttx_344" 450tez 450000000n 450000000n 45000000n

let test_token_to_xtz_345 =
  test_quote_token_to_tez_accuracy "ttx_345" 460tez 230000000n 460000000n 11500000n

let test_token_to_xtz_346 =
  test_quote_token_to_tez_accuracy "ttx_346" 470tez 940000000n 470000000n 188000000n

let test_token_to_xtz_347 =
  test_quote_token_to_tez_accuracy "ttx_347" 480tez 480000000n 480000000n 48000000n

let test_token_to_xtz_348 =
  test_quote_token_to_tez_accuracy "ttx_348" 490tez 245000000n 490000000n 49000000n

let test_token_to_xtz_349 =
  test_quote_token_to_tez_accuracy "ttx_349" 500tez 1000000000n 500000000n 50000000n

let test_token_to_xtz_350 =
  test_quote_token_to_tez_accuracy "ttx_350" 510tez 510000000n 510000000n 25500000n

let test_token_to_xtz_351 =
  test_quote_token_to_tez_accuracy "ttx_351" 520tez 260000000n 520000000n 52000000n

let test_token_to_xtz_352 =
  test_quote_token_to_tez_accuracy "ttx_352" 530tez 1060000000n 530000000n 53000000n

let test_token_to_xtz_353 =
  test_quote_token_to_tez_accuracy "ttx_353" 540tez 540000000n 540000000n 54000000n

let test_token_to_xtz_354 =
  test_quote_token_to_tez_accuracy "ttx_354" 550tez 275000000n 550000000n 55000000n

let test_token_to_xtz_355 =
  test_quote_token_to_tez_accuracy "ttx_355" 560tez 1120000000n 560000000n 56000000n

let test_token_to_xtz_356 =
  test_quote_token_to_tez_accuracy "ttx_356" 570tez 570000000n 570000000n 114000000n

let test_token_to_xtz_357 =
  test_quote_token_to_tez_accuracy "ttx_357" 580tez 290000000n 580000000n 58000000n

let test_token_to_xtz_358 =
  test_quote_token_to_tez_accuracy "ttx_358" 590tez 1180000000n 590000000n 59000000n

let test_token_to_xtz_359 =
  test_quote_token_to_tez_accuracy "ttx_359" 600tez 600000000n 600000000n 60000000n

let test_token_to_xtz_360 =
  test_quote_token_to_tez_accuracy "ttx_360" 610tez 305000000n 610000000n 15250000n

let test_token_to_xtz_361 =
  test_quote_token_to_tez_accuracy "ttx_361" 620tez 1240000000n 620000000n 248000000n

let test_token_to_xtz_362 =
  test_quote_token_to_tez_accuracy "ttx_362" 630tez 630000000n 630000000n 63000000n

let test_token_to_xtz_363 =
  test_quote_token_to_tez_accuracy "ttx_363" 640tez 320000000n 640000000n 64000000n

let test_token_to_xtz_364 =
  test_quote_token_to_tez_accuracy "ttx_364" 650tez 1300000000n 650000000n 65000000n

let test_token_to_xtz_365 =
  test_quote_token_to_tez_accuracy "ttx_365" 660tez 660000000n 660000000n 33000000n

let test_token_to_xtz_366 =
  test_quote_token_to_tez_accuracy "ttx_366" 670tez 335000000n 670000000n 67000000n

let test_token_to_xtz_367 =
  test_quote_token_to_tez_accuracy "ttx_367" 680tez 1360000000n 680000000n 68000000n

let test_token_to_xtz_368 =
  test_quote_token_to_tez_accuracy "ttx_368" 690tez 690000000n 690000000n 69000000n

let test_token_to_xtz_369 =
  test_quote_token_to_tez_accuracy "ttx_369" 700tez 350000000n 700000000n 70000000n

let test_token_to_xtz_370 =
  test_quote_token_to_tez_accuracy "ttx_370" 710tez 1420000000n 710000000n 71000000n

let test_token_to_xtz_371 =
  test_quote_token_to_tez_accuracy "ttx_371" 720tez 720000000n 720000000n 144000000n

let test_token_to_xtz_372 =
  test_quote_token_to_tez_accuracy "ttx_372" 730tez 365000000n 730000000n 73000000n

let test_token_to_xtz_373 =
  test_quote_token_to_tez_accuracy "ttx_373" 740tez 1480000000n 740000000n 74000000n

let test_token_to_xtz_374 =
  test_quote_token_to_tez_accuracy "ttx_374" 750tez 750000000n 750000000n 75000000n

let test_token_to_xtz_375 =
  test_quote_token_to_tez_accuracy "ttx_375" 760tez 380000000n 760000000n 19000000n

let test_token_to_xtz_376 =
  test_quote_token_to_tez_accuracy "ttx_376" 770tez 1540000000n 770000000n 308000000n

let test_token_to_xtz_377 =
  test_quote_token_to_tez_accuracy "ttx_377" 780tez 780000000n 780000000n 78000000n

let test_token_to_xtz_378 =
  test_quote_token_to_tez_accuracy "ttx_378" 790tez 395000000n 790000000n 79000000n

let test_token_to_xtz_379 =
  test_quote_token_to_tez_accuracy "ttx_379" 800tez 1600000000n 800000000n 80000000n

let test_token_to_xtz_380 =
  test_quote_token_to_tez_accuracy "ttx_380" 810tez 810000000n 810000000n 40500000n

let test_token_to_xtz_381 =
  test_quote_token_to_tez_accuracy "ttx_381" 820tez 410000000n 820000000n 82000000n

let test_token_to_xtz_382 =
  test_quote_token_to_tez_accuracy "ttx_382" 830tez 1660000000n 830000000n 83000000n

let test_token_to_xtz_383 =
  test_quote_token_to_tez_accuracy "ttx_383" 840tez 840000000n 840000000n 84000000n

let test_token_to_xtz_384 =
  test_quote_token_to_tez_accuracy "ttx_384" 850tez 425000000n 850000000n 85000000n

let test_token_to_xtz_385 =
  test_quote_token_to_tez_accuracy "ttx_385" 860tez 1720000000n 860000000n 86000000n

let test_token_to_xtz_386 =
  test_quote_token_to_tez_accuracy "ttx_386" 870tez 870000000n 870000000n 174000000n

let test_token_to_xtz_387 =
  test_quote_token_to_tez_accuracy "ttx_387" 880tez 440000000n 880000000n 88000000n

let test_token_to_xtz_388 =
  test_quote_token_to_tez_accuracy "ttx_388" 890tez 1780000000n 890000000n 89000000n

let test_token_to_xtz_389 =
  test_quote_token_to_tez_accuracy "ttx_389" 900tez 900000000n 900000000n 90000000n

let test_token_to_xtz_390 =
  test_quote_token_to_tez_accuracy "ttx_390" 910tez 455000000n 910000000n 22750000n

let test_token_to_xtz_391 =
  test_quote_token_to_tez_accuracy "ttx_391" 920tez 1840000000n 920000000n 368000000n

let test_token_to_xtz_392 =
  test_quote_token_to_tez_accuracy "ttx_392" 930tez 930000000n 930000000n 93000000n

let test_token_to_xtz_393 =
  test_quote_token_to_tez_accuracy "ttx_393" 940tez 470000000n 940000000n 94000000n

let test_token_to_xtz_394 =
  test_quote_token_to_tez_accuracy "ttx_394" 950tez 1900000000n 950000000n 95000000n

let test_token_to_xtz_395 =
  test_quote_token_to_tez_accuracy "ttx_395" 960tez 960000000n 960000000n 48000000n

let test_token_to_xtz_396 =
  test_quote_token_to_tez_accuracy "ttx_396" 970tez 485000000n 970000000n 97000000n

let test_token_to_xtz_397 =
  test_quote_token_to_tez_accuracy "ttx_397" 980tez 1960000000n 980000000n 98000000n

let test_token_to_xtz_398 =
  test_quote_token_to_tez_accuracy "ttx_398" 990tez 990000000n 990000000n 99000000n

let test_token_to_xtz_399 =
  test_quote_token_to_tez_accuracy "ttx_399" 1000tez 500000000n 1000000000n 100000000n

let test_token_to_xtz_400 =
  test_quote_token_to_tez_accuracy "ttx_400" 10tez 20000000n 10000000n 1000000n

let test_token_to_xtz_401 =
  test_quote_token_to_tez_accuracy "ttx_401" 20tez 20000000n 20000000n 4000000n

let test_token_to_xtz_402 =
  test_quote_token_to_tez_accuracy "ttx_402" 30tez 15000000n 30000000n 3000000n

let test_token_to_xtz_403 =
  test_quote_token_to_tez_accuracy "ttx_403" 40tez 80000000n 40000000n 4000000n

let test_token_to_xtz_404 =
  test_quote_token_to_tez_accuracy "ttx_404" 50tez 50000000n 50000000n 5000000n

let test_token_to_xtz_405 =
  test_quote_token_to_tez_accuracy "ttx_405" 60tez 30000000n 60000000n 1500000n

let test_token_to_xtz_406 =
  test_quote_token_to_tez_accuracy "ttx_406" 70tez 140000000n 70000000n 28000000n

let test_token_to_xtz_407 =
  test_quote_token_to_tez_accuracy "ttx_407" 80tez 80000000n 80000000n 8000000n

let test_token_to_xtz_408 =
  test_quote_token_to_tez_accuracy "ttx_408" 90tez 45000000n 90000000n 9000000n

let test_token_to_xtz_409 =
  test_quote_token_to_tez_accuracy "ttx_409" 100tez 200000000n 100000000n 10000000n

let test_token_to_xtz_410 =
  test_quote_token_to_tez_accuracy "ttx_410" 110tez 110000000n 110000000n 5500000n

let test_token_to_xtz_411 =
  test_quote_token_to_tez_accuracy "ttx_411" 120tez 60000000n 120000000n 12000000n

let test_token_to_xtz_412 =
  test_quote_token_to_tez_accuracy "ttx_412" 130tez 260000000n 130000000n 13000000n

let test_token_to_xtz_413 =
  test_quote_token_to_tez_accuracy "ttx_413" 140tez 140000000n 140000000n 14000000n

let test_token_to_xtz_414 =
  test_quote_token_to_tez_accuracy "ttx_414" 150tez 75000000n 150000000n 15000000n

let test_token_to_xtz_415 =
  test_quote_token_to_tez_accuracy "ttx_415" 160tez 320000000n 160000000n 16000000n

let test_token_to_xtz_416 =
  test_quote_token_to_tez_accuracy "ttx_416" 170tez 170000000n 170000000n 34000000n

let test_token_to_xtz_417 =
  test_quote_token_to_tez_accuracy "ttx_417" 180tez 90000000n 180000000n 18000000n

let test_token_to_xtz_418 =
  test_quote_token_to_tez_accuracy "ttx_418" 190tez 380000000n 190000000n 19000000n

let test_token_to_xtz_419 =
  test_quote_token_to_tez_accuracy "ttx_419" 200tez 200000000n 200000000n 20000000n

let test_token_to_xtz_420 =
  test_quote_token_to_tez_accuracy "ttx_420" 210tez 105000000n 210000000n 5250000n

let test_token_to_xtz_421 =
  test_quote_token_to_tez_accuracy "ttx_421" 220tez 440000000n 220000000n 88000000n

let test_token_to_xtz_422 =
  test_quote_token_to_tez_accuracy "ttx_422" 230tez 230000000n 230000000n 23000000n

let test_token_to_xtz_423 =
  test_quote_token_to_tez_accuracy "ttx_423" 240tez 120000000n 240000000n 24000000n

let test_token_to_xtz_424 =
  test_quote_token_to_tez_accuracy "ttx_424" 250tez 500000000n 250000000n 25000000n

let test_token_to_xtz_425 =
  test_quote_token_to_tez_accuracy "ttx_425" 260tez 260000000n 260000000n 13000000n

let test_token_to_xtz_426 =
  test_quote_token_to_tez_accuracy "ttx_426" 270tez 135000000n 270000000n 27000000n

let test_token_to_xtz_427 =
  test_quote_token_to_tez_accuracy "ttx_427" 280tez 560000000n 280000000n 28000000n

let test_token_to_xtz_428 =
  test_quote_token_to_tez_accuracy "ttx_428" 290tez 290000000n 290000000n 29000000n

let test_token_to_xtz_429 =
  test_quote_token_to_tez_accuracy "ttx_429" 300tez 150000000n 300000000n 30000000n

let test_token_to_xtz_430 =
  test_quote_token_to_tez_accuracy "ttx_430" 310tez 620000000n 310000000n 31000000n

let test_token_to_xtz_431 =
  test_quote_token_to_tez_accuracy "ttx_431" 320tez 320000000n 320000000n 64000000n

let test_token_to_xtz_432 =
  test_quote_token_to_tez_accuracy "ttx_432" 330tez 165000000n 330000000n 33000000n

let test_token_to_xtz_433 =
  test_quote_token_to_tez_accuracy "ttx_433" 340tez 680000000n 340000000n 34000000n

let test_token_to_xtz_434 =
  test_quote_token_to_tez_accuracy "ttx_434" 350tez 350000000n 350000000n 35000000n

let test_token_to_xtz_435 =
  test_quote_token_to_tez_accuracy "ttx_435" 360tez 180000000n 360000000n 9000000n

let test_token_to_xtz_436 =
  test_quote_token_to_tez_accuracy "ttx_436" 370tez 740000000n 370000000n 148000000n

let test_token_to_xtz_437 =
  test_quote_token_to_tez_accuracy "ttx_437" 380tez 380000000n 380000000n 38000000n

let test_token_to_xtz_438 =
  test_quote_token_to_tez_accuracy "ttx_438" 390tez 195000000n 390000000n 39000000n

let test_token_to_xtz_439 =
  test_quote_token_to_tez_accuracy "ttx_439" 400tez 800000000n 400000000n 40000000n

let test_token_to_xtz_440 =
  test_quote_token_to_tez_accuracy "ttx_440" 410tez 410000000n 410000000n 20500000n

let test_token_to_xtz_441 =
  test_quote_token_to_tez_accuracy "ttx_441" 420tez 210000000n 420000000n 42000000n

let test_token_to_xtz_442 =
  test_quote_token_to_tez_accuracy "ttx_442" 430tez 860000000n 430000000n 43000000n

let test_token_to_xtz_443 =
  test_quote_token_to_tez_accuracy "ttx_443" 440tez 440000000n 440000000n 44000000n

let test_token_to_xtz_444 =
  test_quote_token_to_tez_accuracy "ttx_444" 450tez 225000000n 450000000n 45000000n

let test_token_to_xtz_445 =
  test_quote_token_to_tez_accuracy "ttx_445" 460tez 920000000n 460000000n 46000000n

let test_token_to_xtz_446 =
  test_quote_token_to_tez_accuracy "ttx_446" 470tez 470000000n 470000000n 94000000n

let test_token_to_xtz_447 =
  test_quote_token_to_tez_accuracy "ttx_447" 480tez 240000000n 480000000n 48000000n

let test_token_to_xtz_448 =
  test_quote_token_to_tez_accuracy "ttx_448" 490tez 980000000n 490000000n 49000000n

let test_token_to_xtz_449 =
  test_quote_token_to_tez_accuracy "ttx_449" 500tez 500000000n 500000000n 50000000n

let test_token_to_xtz_450 =
  test_quote_token_to_tez_accuracy "ttx_450" 510tez 255000000n 510000000n 12750000n

let test_token_to_xtz_451 =
  test_quote_token_to_tez_accuracy "ttx_451" 520tez 1040000000n 520000000n 208000000n

let test_token_to_xtz_452 =
  test_quote_token_to_tez_accuracy "ttx_452" 530tez 530000000n 530000000n 53000000n

let test_token_to_xtz_453 =
  test_quote_token_to_tez_accuracy "ttx_453" 540tez 270000000n 540000000n 54000000n

let test_token_to_xtz_454 =
  test_quote_token_to_tez_accuracy "ttx_454" 550tez 1100000000n 550000000n 55000000n

let test_token_to_xtz_455 =
  test_quote_token_to_tez_accuracy "ttx_455" 560tez 560000000n 560000000n 28000000n

let test_token_to_xtz_456 =
  test_quote_token_to_tez_accuracy "ttx_456" 570tez 285000000n 570000000n 57000000n

let test_token_to_xtz_457 =
  test_quote_token_to_tez_accuracy "ttx_457" 580tez 1160000000n 580000000n 58000000n

let test_token_to_xtz_458 =
  test_quote_token_to_tez_accuracy "ttx_458" 590tez 590000000n 590000000n 59000000n

let test_token_to_xtz_459 =
  test_quote_token_to_tez_accuracy "ttx_459" 600tez 300000000n 600000000n 60000000n

let test_token_to_xtz_460 =
  test_quote_token_to_tez_accuracy "ttx_460" 610tez 1220000000n 610000000n 61000000n

let test_token_to_xtz_461 =
  test_quote_token_to_tez_accuracy "ttx_461" 620tez 620000000n 620000000n 124000000n

let test_token_to_xtz_462 =
  test_quote_token_to_tez_accuracy "ttx_462" 630tez 315000000n 630000000n 63000000n

let test_token_to_xtz_463 =
  test_quote_token_to_tez_accuracy "ttx_463" 640tez 1280000000n 640000000n 64000000n

let test_token_to_xtz_464 =
  test_quote_token_to_tez_accuracy "ttx_464" 650tez 650000000n 650000000n 65000000n

let test_token_to_xtz_465 =
  test_quote_token_to_tez_accuracy "ttx_465" 660tez 330000000n 660000000n 16500000n

let test_token_to_xtz_466 =
  test_quote_token_to_tez_accuracy "ttx_466" 670tez 1340000000n 670000000n 268000000n

let test_token_to_xtz_467 =
  test_quote_token_to_tez_accuracy "ttx_467" 680tez 680000000n 680000000n 68000000n

let test_token_to_xtz_468 =
  test_quote_token_to_tez_accuracy "ttx_468" 690tez 345000000n 690000000n 69000000n

let test_token_to_xtz_469 =
  test_quote_token_to_tez_accuracy "ttx_469" 700tez 1400000000n 700000000n 70000000n

let test_token_to_xtz_470 =
  test_quote_token_to_tez_accuracy "ttx_470" 710tez 710000000n 710000000n 35500000n

let test_token_to_xtz_471 =
  test_quote_token_to_tez_accuracy "ttx_471" 720tez 360000000n 720000000n 72000000n

let test_token_to_xtz_472 =
  test_quote_token_to_tez_accuracy "ttx_472" 730tez 1460000000n 730000000n 73000000n

let test_token_to_xtz_473 =
  test_quote_token_to_tez_accuracy "ttx_473" 740tez 740000000n 740000000n 74000000n

let test_token_to_xtz_474 =
  test_quote_token_to_tez_accuracy "ttx_474" 750tez 375000000n 750000000n 75000000n

let test_token_to_xtz_475 =
  test_quote_token_to_tez_accuracy "ttx_475" 760tez 1520000000n 760000000n 76000000n

let test_token_to_xtz_476 =
  test_quote_token_to_tez_accuracy "ttx_476" 770tez 770000000n 770000000n 154000000n

let test_token_to_xtz_477 =
  test_quote_token_to_tez_accuracy "ttx_477" 780tez 390000000n 780000000n 78000000n

let test_token_to_xtz_478 =
  test_quote_token_to_tez_accuracy "ttx_478" 790tez 1580000000n 790000000n 79000000n

let test_token_to_xtz_479 =
  test_quote_token_to_tez_accuracy "ttx_479" 800tez 800000000n 800000000n 80000000n

let test_token_to_xtz_480 =
  test_quote_token_to_tez_accuracy "ttx_480" 810tez 405000000n 810000000n 20250000n

let test_token_to_xtz_481 =
  test_quote_token_to_tez_accuracy "ttx_481" 820tez 1640000000n 820000000n 328000000n

let test_token_to_xtz_482 =
  test_quote_token_to_tez_accuracy "ttx_482" 830tez 830000000n 830000000n 83000000n

let test_token_to_xtz_483 =
  test_quote_token_to_tez_accuracy "ttx_483" 840tez 420000000n 840000000n 84000000n

let test_token_to_xtz_484 =
  test_quote_token_to_tez_accuracy "ttx_484" 850tez 1700000000n 850000000n 85000000n

let test_token_to_xtz_485 =
  test_quote_token_to_tez_accuracy "ttx_485" 860tez 860000000n 860000000n 43000000n

let test_token_to_xtz_486 =
  test_quote_token_to_tez_accuracy "ttx_486" 870tez 435000000n 870000000n 87000000n

let test_token_to_xtz_487 =
  test_quote_token_to_tez_accuracy "ttx_487" 880tez 1760000000n 880000000n 88000000n

let test_token_to_xtz_488 =
  test_quote_token_to_tez_accuracy "ttx_488" 890tez 890000000n 890000000n 89000000n

let test_token_to_xtz_489 =
  test_quote_token_to_tez_accuracy "ttx_489" 900tez 450000000n 900000000n 90000000n

let test_token_to_xtz_490 =
  test_quote_token_to_tez_accuracy "ttx_490" 910tez 1820000000n 910000000n 91000000n

let test_token_to_xtz_491 =
  test_quote_token_to_tez_accuracy "ttx_491" 920tez 920000000n 920000000n 184000000n

let test_token_to_xtz_492 =
  test_quote_token_to_tez_accuracy "ttx_492" 930tez 465000000n 930000000n 93000000n

let test_token_to_xtz_493 =
  test_quote_token_to_tez_accuracy "ttx_493" 940tez 1880000000n 940000000n 94000000n

let test_token_to_xtz_494 =
  test_quote_token_to_tez_accuracy "ttx_494" 950tez 950000000n 950000000n 95000000n

let test_token_to_xtz_495 =
  test_quote_token_to_tez_accuracy "ttx_495" 960tez 480000000n 960000000n 24000000n

let test_token_to_xtz_496 =
  test_quote_token_to_tez_accuracy "ttx_496" 970tez 1940000000n 970000000n 388000000n

let test_token_to_xtz_497 =
  test_quote_token_to_tez_accuracy "ttx_497" 980tez 980000000n 980000000n 98000000n

let test_token_to_xtz_498 =
  test_quote_token_to_tez_accuracy "ttx_498" 990tez 495000000n 990000000n 99000000n

let test_token_to_xtz_499 =
  test_quote_token_to_tez_accuracy "ttx_499" 1000tez 2000000000n 1000000000n 100000000n

let test_token_to_xtz_500 =
  test_quote_token_to_tez_accuracy "ttx_500" 10tez 10000000n 10000000n 500000n

let test_token_to_xtz_501 =
  test_quote_token_to_tez_accuracy "ttx_501" 20tez 10000000n 20000000n 2000000n

let test_token_to_xtz_502 =
  test_quote_token_to_tez_accuracy "ttx_502" 30tez 60000000n 30000000n 3000000n

let test_token_to_xtz_503 =
  test_quote_token_to_tez_accuracy "ttx_503" 40tez 40000000n 40000000n 4000000n

let test_token_to_xtz_504 =
  test_quote_token_to_tez_accuracy "ttx_504" 50tez 25000000n 50000000n 5000000n

let test_token_to_xtz_505 =
  test_quote_token_to_tez_accuracy "ttx_505" 60tez 120000000n 60000000n 6000000n

let test_token_to_xtz_506 =
  test_quote_token_to_tez_accuracy "ttx_506" 70tez 70000000n 70000000n 14000000n

let test_token_to_xtz_507 =
  test_quote_token_to_tez_accuracy "ttx_507" 80tez 40000000n 80000000n 8000000n

let test_token_to_xtz_508 =
  test_quote_token_to_tez_accuracy "ttx_508" 90tez 180000000n 90000000n 9000000n

let test_token_to_xtz_509 =
  test_quote_token_to_tez_accuracy "ttx_509" 100tez 100000000n 100000000n 10000000n

let test_token_to_xtz_510 =
  test_quote_token_to_tez_accuracy "ttx_510" 110tez 55000000n 110000000n 2750000n

let test_token_to_xtz_511 =
  test_quote_token_to_tez_accuracy "ttx_511" 120tez 240000000n 120000000n 48000000n

let test_token_to_xtz_512 =
  test_quote_token_to_tez_accuracy "ttx_512" 130tez 130000000n 130000000n 13000000n

let test_token_to_xtz_513 =
  test_quote_token_to_tez_accuracy "ttx_513" 140tez 70000000n 140000000n 14000000n

let test_token_to_xtz_514 =
  test_quote_token_to_tez_accuracy "ttx_514" 150tez 300000000n 150000000n 15000000n

let test_token_to_xtz_515 =
  test_quote_token_to_tez_accuracy "ttx_515" 160tez 160000000n 160000000n 8000000n

let test_token_to_xtz_516 =
  test_quote_token_to_tez_accuracy "ttx_516" 170tez 85000000n 170000000n 17000000n

let test_token_to_xtz_517 =
  test_quote_token_to_tez_accuracy "ttx_517" 180tez 360000000n 180000000n 18000000n

let test_token_to_xtz_518 =
  test_quote_token_to_tez_accuracy "ttx_518" 190tez 190000000n 190000000n 19000000n

let test_token_to_xtz_519 =
  test_quote_token_to_tez_accuracy "ttx_519" 200tez 100000000n 200000000n 20000000n

let test_token_to_xtz_520 =
  test_quote_token_to_tez_accuracy "ttx_520" 210tez 420000000n 210000000n 21000000n

let test_token_to_xtz_521 =
  test_quote_token_to_tez_accuracy "ttx_521" 220tez 220000000n 220000000n 44000000n

let test_token_to_xtz_522 =
  test_quote_token_to_tez_accuracy "ttx_522" 230tez 115000000n 230000000n 23000000n

let test_token_to_xtz_523 =
  test_quote_token_to_tez_accuracy "ttx_523" 240tez 480000000n 240000000n 24000000n

let test_token_to_xtz_524 =
  test_quote_token_to_tez_accuracy "ttx_524" 250tez 250000000n 250000000n 25000000n

let test_token_to_xtz_525 =
  test_quote_token_to_tez_accuracy "ttx_525" 260tez 130000000n 260000000n 6500000n

let test_token_to_xtz_526 =
  test_quote_token_to_tez_accuracy "ttx_526" 270tez 540000000n 270000000n 108000000n

let test_token_to_xtz_527 =
  test_quote_token_to_tez_accuracy "ttx_527" 280tez 280000000n 280000000n 28000000n

let test_token_to_xtz_528 =
  test_quote_token_to_tez_accuracy "ttx_528" 290tez 145000000n 290000000n 29000000n

let test_token_to_xtz_529 =
  test_quote_token_to_tez_accuracy "ttx_529" 300tez 600000000n 300000000n 30000000n

let test_token_to_xtz_530 =
  test_quote_token_to_tez_accuracy "ttx_530" 310tez 310000000n 310000000n 15500000n

let test_token_to_xtz_531 =
  test_quote_token_to_tez_accuracy "ttx_531" 320tez 160000000n 320000000n 32000000n

let test_token_to_xtz_532 =
  test_quote_token_to_tez_accuracy "ttx_532" 330tez 660000000n 330000000n 33000000n

let test_token_to_xtz_533 =
  test_quote_token_to_tez_accuracy "ttx_533" 340tez 340000000n 340000000n 34000000n

let test_token_to_xtz_534 =
  test_quote_token_to_tez_accuracy "ttx_534" 350tez 175000000n 350000000n 35000000n

let test_token_to_xtz_535 =
  test_quote_token_to_tez_accuracy "ttx_535" 360tez 720000000n 360000000n 36000000n

let test_token_to_xtz_536 =
  test_quote_token_to_tez_accuracy "ttx_536" 370tez 370000000n 370000000n 74000000n

let test_token_to_xtz_537 =
  test_quote_token_to_tez_accuracy "ttx_537" 380tez 190000000n 380000000n 38000000n

let test_token_to_xtz_538 =
  test_quote_token_to_tez_accuracy "ttx_538" 390tez 780000000n 390000000n 39000000n

let test_token_to_xtz_539 =
  test_quote_token_to_tez_accuracy "ttx_539" 400tez 400000000n 400000000n 40000000n

let test_token_to_xtz_540 =
  test_quote_token_to_tez_accuracy "ttx_540" 410tez 205000000n 410000000n 10250000n

let test_token_to_xtz_541 =
  test_quote_token_to_tez_accuracy "ttx_541" 420tez 840000000n 420000000n 168000000n

let test_token_to_xtz_542 =
  test_quote_token_to_tez_accuracy "ttx_542" 430tez 430000000n 430000000n 43000000n

let test_token_to_xtz_543 =
  test_quote_token_to_tez_accuracy "ttx_543" 440tez 220000000n 440000000n 44000000n

let test_token_to_xtz_544 =
  test_quote_token_to_tez_accuracy "ttx_544" 450tez 900000000n 450000000n 45000000n

let test_token_to_xtz_545 =
  test_quote_token_to_tez_accuracy "ttx_545" 460tez 460000000n 460000000n 23000000n

let test_token_to_xtz_546 =
  test_quote_token_to_tez_accuracy "ttx_546" 470tez 235000000n 470000000n 47000000n

let test_token_to_xtz_547 =
  test_quote_token_to_tez_accuracy "ttx_547" 480tez 960000000n 480000000n 48000000n

let test_token_to_xtz_548 =
  test_quote_token_to_tez_accuracy "ttx_548" 490tez 490000000n 490000000n 49000000n

let test_token_to_xtz_549 =
  test_quote_token_to_tez_accuracy "ttx_549" 500tez 250000000n 500000000n 50000000n

let test_token_to_xtz_550 =
  test_quote_token_to_tez_accuracy "ttx_550" 510tez 1020000000n 510000000n 51000000n

let test_token_to_xtz_551 =
  test_quote_token_to_tez_accuracy "ttx_551" 520tez 520000000n 520000000n 104000000n

let test_token_to_xtz_552 =
  test_quote_token_to_tez_accuracy "ttx_552" 530tez 265000000n 530000000n 53000000n

let test_token_to_xtz_553 =
  test_quote_token_to_tez_accuracy "ttx_553" 540tez 1080000000n 540000000n 54000000n

let test_token_to_xtz_554 =
  test_quote_token_to_tez_accuracy "ttx_554" 550tez 550000000n 550000000n 55000000n

let test_token_to_xtz_555 =
  test_quote_token_to_tez_accuracy "ttx_555" 560tez 280000000n 560000000n 14000000n

let test_token_to_xtz_556 =
  test_quote_token_to_tez_accuracy "ttx_556" 570tez 1140000000n 570000000n 228000000n

let test_token_to_xtz_557 =
  test_quote_token_to_tez_accuracy "ttx_557" 580tez 580000000n 580000000n 58000000n

let test_token_to_xtz_558 =
  test_quote_token_to_tez_accuracy "ttx_558" 590tez 295000000n 590000000n 59000000n

let test_token_to_xtz_559 =
  test_quote_token_to_tez_accuracy "ttx_559" 600tez 1200000000n 600000000n 60000000n

let test_token_to_xtz_560 =
  test_quote_token_to_tez_accuracy "ttx_560" 610tez 610000000n 610000000n 30500000n

(*****************************************************************************)
(* Token to XTZ Quote Tests - More Variations (Batch 561-760)              *)
(*****************************************************************************)
let test_token_to_xtz_561 =
  test_quote_token_to_tez_accuracy "ttx_561" 620tez 310000000n 620000000n 62000000n

let test_token_to_xtz_562 =
  test_quote_token_to_tez_accuracy "ttx_562" 630tez 1260000000n 630000000n 63000000n

let test_token_to_xtz_563 =
  test_quote_token_to_tez_accuracy "ttx_563" 640tez 640000000n 640000000n 64000000n

let test_token_to_xtz_564 =
  test_quote_token_to_tez_accuracy "ttx_564" 650tez 325000000n 650000000n 65000000n

let test_token_to_xtz_565 =
  test_quote_token_to_tez_accuracy "ttx_565" 660tez 1320000000n 660000000n 66000000n

let test_token_to_xtz_566 =
  test_quote_token_to_tez_accuracy "ttx_566" 670tez 670000000n 670000000n 134000000n

let test_token_to_xtz_567 =
  test_quote_token_to_tez_accuracy "ttx_567" 680tez 340000000n 680000000n 68000000n

let test_token_to_xtz_568 =
  test_quote_token_to_tez_accuracy "ttx_568" 690tez 1380000000n 690000000n 69000000n

let test_token_to_xtz_569 =
  test_quote_token_to_tez_accuracy "ttx_569" 700tez 700000000n 700000000n 70000000n

let test_token_to_xtz_570 =
  test_quote_token_to_tez_accuracy "ttx_570" 710tez 355000000n 710000000n 17750000n

let test_token_to_xtz_571 =
  test_quote_token_to_tez_accuracy "ttx_571" 720tez 1440000000n 720000000n 288000000n

let test_token_to_xtz_572 =
  test_quote_token_to_tez_accuracy "ttx_572" 730tez 730000000n 730000000n 73000000n

let test_token_to_xtz_573 =
  test_quote_token_to_tez_accuracy "ttx_573" 740tez 370000000n 740000000n 74000000n

let test_token_to_xtz_574 =
  test_quote_token_to_tez_accuracy "ttx_574" 750tez 1500000000n 750000000n 75000000n

let test_token_to_xtz_575 =
  test_quote_token_to_tez_accuracy "ttx_575" 760tez 760000000n 760000000n 38000000n

let test_token_to_xtz_576 =
  test_quote_token_to_tez_accuracy "ttx_576" 770tez 385000000n 770000000n 77000000n

let test_token_to_xtz_577 =
  test_quote_token_to_tez_accuracy "ttx_577" 780tez 1560000000n 780000000n 78000000n

let test_token_to_xtz_578 =
  test_quote_token_to_tez_accuracy "ttx_578" 790tez 790000000n 790000000n 79000000n

let test_token_to_xtz_579 =
  test_quote_token_to_tez_accuracy "ttx_579" 800tez 400000000n 800000000n 80000000n

let test_token_to_xtz_580 =
  test_quote_token_to_tez_accuracy "ttx_580" 810tez 1620000000n 810000000n 81000000n

let test_token_to_xtz_581 =
  test_quote_token_to_tez_accuracy "ttx_581" 820tez 820000000n 820000000n 164000000n

let test_token_to_xtz_582 =
  test_quote_token_to_tez_accuracy "ttx_582" 830tez 415000000n 830000000n 83000000n

let test_token_to_xtz_583 =
  test_quote_token_to_tez_accuracy "ttx_583" 840tez 1680000000n 840000000n 84000000n

let test_token_to_xtz_584 =
  test_quote_token_to_tez_accuracy "ttx_584" 850tez 850000000n 850000000n 85000000n

let test_token_to_xtz_585 =
  test_quote_token_to_tez_accuracy "ttx_585" 860tez 430000000n 860000000n 21500000n

let test_token_to_xtz_586 =
  test_quote_token_to_tez_accuracy "ttx_586" 870tez 1740000000n 870000000n 348000000n

let test_token_to_xtz_587 =
  test_quote_token_to_tez_accuracy "ttx_587" 880tez 880000000n 880000000n 88000000n

let test_token_to_xtz_588 =
  test_quote_token_to_tez_accuracy "ttx_588" 890tez 445000000n 890000000n 89000000n

let test_token_to_xtz_589 =
  test_quote_token_to_tez_accuracy "ttx_589" 900tez 1800000000n 900000000n 90000000n

let test_token_to_xtz_590 =
  test_quote_token_to_tez_accuracy "ttx_590" 910tez 910000000n 910000000n 45500000n

let test_token_to_xtz_591 =
  test_quote_token_to_tez_accuracy "ttx_591" 920tez 460000000n 920000000n 92000000n

let test_token_to_xtz_592 =
  test_quote_token_to_tez_accuracy "ttx_592" 930tez 1860000000n 930000000n 93000000n

let test_token_to_xtz_593 =
  test_quote_token_to_tez_accuracy "ttx_593" 940tez 940000000n 940000000n 94000000n

let test_token_to_xtz_594 =
  test_quote_token_to_tez_accuracy "ttx_594" 950tez 475000000n 950000000n 95000000n

let test_token_to_xtz_595 =
  test_quote_token_to_tez_accuracy "ttx_595" 960tez 1920000000n 960000000n 96000000n

let test_token_to_xtz_596 =
  test_quote_token_to_tez_accuracy "ttx_596" 970tez 970000000n 970000000n 194000000n

let test_token_to_xtz_597 =
  test_quote_token_to_tez_accuracy "ttx_597" 980tez 490000000n 980000000n 98000000n

let test_token_to_xtz_598 =
  test_quote_token_to_tez_accuracy "ttx_598" 990tez 1980000000n 990000000n 99000000n

let test_token_to_xtz_599 =
  test_quote_token_to_tez_accuracy "ttx_599" 1000tez 1000000000n 1000000000n 100000000n

let test_token_to_xtz_600 =
  test_quote_token_to_tez_accuracy "ttx_600" 10tez 5000000n 10000000n 250000n

let test_token_to_xtz_601 =
  test_quote_token_to_tez_accuracy "ttx_601" 20tez 40000000n 20000000n 8000000n

let test_token_to_xtz_602 =
  test_quote_token_to_tez_accuracy "ttx_602" 30tez 30000000n 30000000n 3000000n

let test_token_to_xtz_603 =
  test_quote_token_to_tez_accuracy "ttx_603" 40tez 20000000n 40000000n 4000000n

let test_token_to_xtz_604 =
  test_quote_token_to_tez_accuracy "ttx_604" 50tez 100000000n 50000000n 5000000n

let test_token_to_xtz_605 =
  test_quote_token_to_tez_accuracy "ttx_605" 60tez 60000000n 60000000n 3000000n

let test_token_to_xtz_606 =
  test_quote_token_to_tez_accuracy "ttx_606" 70tez 35000000n 70000000n 7000000n

let test_token_to_xtz_607 =
  test_quote_token_to_tez_accuracy "ttx_607" 80tez 160000000n 80000000n 8000000n

let test_token_to_xtz_608 =
  test_quote_token_to_tez_accuracy "ttx_608" 90tez 90000000n 90000000n 9000000n

let test_token_to_xtz_609 =
  test_quote_token_to_tez_accuracy "ttx_609" 100tez 50000000n 100000000n 10000000n

let test_token_to_xtz_610 =
  test_quote_token_to_tez_accuracy "ttx_610" 110tez 220000000n 110000000n 11000000n

let test_token_to_xtz_611 =
  test_quote_token_to_tez_accuracy "ttx_611" 120tez 120000000n 120000000n 24000000n

let test_token_to_xtz_612 =
  test_quote_token_to_tez_accuracy "ttx_612" 130tez 65000000n 130000000n 13000000n

let test_token_to_xtz_613 =
  test_quote_token_to_tez_accuracy "ttx_613" 140tez 280000000n 140000000n 14000000n

let test_token_to_xtz_614 =
  test_quote_token_to_tez_accuracy "ttx_614" 150tez 150000000n 150000000n 15000000n

let test_token_to_xtz_615 =
  test_quote_token_to_tez_accuracy "ttx_615" 160tez 80000000n 160000000n 4000000n

let test_token_to_xtz_616 =
  test_quote_token_to_tez_accuracy "ttx_616" 170tez 340000000n 170000000n 68000000n

let test_token_to_xtz_617 =
  test_quote_token_to_tez_accuracy "ttx_617" 180tez 180000000n 180000000n 18000000n

let test_token_to_xtz_618 =
  test_quote_token_to_tez_accuracy "ttx_618" 190tez 95000000n 190000000n 19000000n

let test_token_to_xtz_619 =
  test_quote_token_to_tez_accuracy "ttx_619" 200tez 400000000n 200000000n 20000000n

let test_token_to_xtz_620 =
  test_quote_token_to_tez_accuracy "ttx_620" 210tez 210000000n 210000000n 10500000n

let test_token_to_xtz_621 =
  test_quote_token_to_tez_accuracy "ttx_621" 220tez 110000000n 220000000n 22000000n

let test_token_to_xtz_622 =
  test_quote_token_to_tez_accuracy "ttx_622" 230tez 460000000n 230000000n 23000000n

let test_token_to_xtz_623 =
  test_quote_token_to_tez_accuracy "ttx_623" 240tez 240000000n 240000000n 24000000n

let test_token_to_xtz_624 =
  test_quote_token_to_tez_accuracy "ttx_624" 250tez 125000000n 250000000n 25000000n

let test_token_to_xtz_625 =
  test_quote_token_to_tez_accuracy "ttx_625" 260tez 520000000n 260000000n 26000000n

let test_token_to_xtz_626 =
  test_quote_token_to_tez_accuracy "ttx_626" 270tez 270000000n 270000000n 54000000n

let test_token_to_xtz_627 =
  test_quote_token_to_tez_accuracy "ttx_627" 280tez 140000000n 280000000n 28000000n

let test_token_to_xtz_628 =
  test_quote_token_to_tez_accuracy "ttx_628" 290tez 580000000n 290000000n 29000000n

let test_token_to_xtz_629 =
  test_quote_token_to_tez_accuracy "ttx_629" 300tez 300000000n 300000000n 30000000n

let test_token_to_xtz_630 =
  test_quote_token_to_tez_accuracy "ttx_630" 310tez 155000000n 310000000n 7750000n

let test_token_to_xtz_631 =
  test_quote_token_to_tez_accuracy "ttx_631" 320tez 640000000n 320000000n 128000000n

let test_token_to_xtz_632 =
  test_quote_token_to_tez_accuracy "ttx_632" 330tez 330000000n 330000000n 33000000n

let test_token_to_xtz_633 =
  test_quote_token_to_tez_accuracy "ttx_633" 340tez 170000000n 340000000n 34000000n

let test_token_to_xtz_634 =
  test_quote_token_to_tez_accuracy "ttx_634" 350tez 700000000n 350000000n 35000000n

let test_token_to_xtz_635 =
  test_quote_token_to_tez_accuracy "ttx_635" 360tez 360000000n 360000000n 18000000n

let test_token_to_xtz_636 =
  test_quote_token_to_tez_accuracy "ttx_636" 370tez 185000000n 370000000n 37000000n

let test_token_to_xtz_637 =
  test_quote_token_to_tez_accuracy "ttx_637" 380tez 760000000n 380000000n 38000000n

let test_token_to_xtz_638 =
  test_quote_token_to_tez_accuracy "ttx_638" 390tez 390000000n 390000000n 39000000n

let test_token_to_xtz_639 =
  test_quote_token_to_tez_accuracy "ttx_639" 400tez 200000000n 400000000n 40000000n

let test_token_to_xtz_640 =
  test_quote_token_to_tez_accuracy "ttx_640" 410tez 820000000n 410000000n 41000000n

let test_token_to_xtz_641 =
  test_quote_token_to_tez_accuracy "ttx_641" 420tez 420000000n 420000000n 84000000n

let test_token_to_xtz_642 =
  test_quote_token_to_tez_accuracy "ttx_642" 430tez 215000000n 430000000n 43000000n

let test_token_to_xtz_643 =
  test_quote_token_to_tez_accuracy "ttx_643" 440tez 880000000n 440000000n 44000000n

let test_token_to_xtz_644 =
  test_quote_token_to_tez_accuracy "ttx_644" 450tez 450000000n 450000000n 45000000n

let test_token_to_xtz_645 =
  test_quote_token_to_tez_accuracy "ttx_645" 460tez 230000000n 460000000n 11500000n

let test_token_to_xtz_646 =
  test_quote_token_to_tez_accuracy "ttx_646" 470tez 940000000n 470000000n 188000000n

let test_token_to_xtz_647 =
  test_quote_token_to_tez_accuracy "ttx_647" 480tez 480000000n 480000000n 48000000n

let test_token_to_xtz_648 =
  test_quote_token_to_tez_accuracy "ttx_648" 490tez 245000000n 490000000n 49000000n

let test_token_to_xtz_649 =
  test_quote_token_to_tez_accuracy "ttx_649" 500tez 1000000000n 500000000n 50000000n

let test_token_to_xtz_650 =
  test_quote_token_to_tez_accuracy "ttx_650" 510tez 510000000n 510000000n 25500000n

let test_token_to_xtz_651 =
  test_quote_token_to_tez_accuracy "ttx_651" 520tez 260000000n 520000000n 52000000n

let test_token_to_xtz_652 =
  test_quote_token_to_tez_accuracy "ttx_652" 530tez 1060000000n 530000000n 53000000n

let test_token_to_xtz_653 =
  test_quote_token_to_tez_accuracy "ttx_653" 540tez 540000000n 540000000n 54000000n

let test_token_to_xtz_654 =
  test_quote_token_to_tez_accuracy "ttx_654" 550tez 275000000n 550000000n 55000000n

let test_token_to_xtz_655 =
  test_quote_token_to_tez_accuracy "ttx_655" 560tez 1120000000n 560000000n 56000000n

let test_token_to_xtz_656 =
  test_quote_token_to_tez_accuracy "ttx_656" 570tez 570000000n 570000000n 114000000n

let test_token_to_xtz_657 =
  test_quote_token_to_tez_accuracy "ttx_657" 580tez 290000000n 580000000n 58000000n

let test_token_to_xtz_658 =
  test_quote_token_to_tez_accuracy "ttx_658" 590tez 1180000000n 590000000n 59000000n

let test_token_to_xtz_659 =
  test_quote_token_to_tez_accuracy "ttx_659" 600tez 600000000n 600000000n 60000000n

let test_token_to_xtz_660 =
  test_quote_token_to_tez_accuracy "ttx_660" 610tez 305000000n 610000000n 15250000n

let test_token_to_xtz_661 =
  test_quote_token_to_tez_accuracy "ttx_661" 620tez 1240000000n 620000000n 248000000n

let test_token_to_xtz_662 =
  test_quote_token_to_tez_accuracy "ttx_662" 630tez 630000000n 630000000n 63000000n

let test_token_to_xtz_663 =
  test_quote_token_to_tez_accuracy "ttx_663" 640tez 320000000n 640000000n 64000000n

let test_token_to_xtz_664 =
  test_quote_token_to_tez_accuracy "ttx_664" 650tez 1300000000n 650000000n 65000000n

let test_token_to_xtz_665 =
  test_quote_token_to_tez_accuracy "ttx_665" 660tez 660000000n 660000000n 33000000n

let test_token_to_xtz_666 =
  test_quote_token_to_tez_accuracy "ttx_666" 670tez 335000000n 670000000n 67000000n

let test_token_to_xtz_667 =
  test_quote_token_to_tez_accuracy "ttx_667" 680tez 1360000000n 680000000n 68000000n

let test_token_to_xtz_668 =
  test_quote_token_to_tez_accuracy "ttx_668" 690tez 690000000n 690000000n 69000000n

let test_token_to_xtz_669 =
  test_quote_token_to_tez_accuracy "ttx_669" 700tez 350000000n 700000000n 70000000n

let test_token_to_xtz_670 =
  test_quote_token_to_tez_accuracy "ttx_670" 710tez 1420000000n 710000000n 71000000n

let test_token_to_xtz_671 =
  test_quote_token_to_tez_accuracy "ttx_671" 720tez 720000000n 720000000n 144000000n

let test_token_to_xtz_672 =
  test_quote_token_to_tez_accuracy "ttx_672" 730tez 365000000n 730000000n 73000000n

let test_token_to_xtz_673 =
  test_quote_token_to_tez_accuracy "ttx_673" 740tez 1480000000n 740000000n 74000000n

let test_token_to_xtz_674 =
  test_quote_token_to_tez_accuracy "ttx_674" 750tez 750000000n 750000000n 75000000n

let test_token_to_xtz_675 =
  test_quote_token_to_tez_accuracy "ttx_675" 760tez 380000000n 760000000n 19000000n

let test_token_to_xtz_676 =
  test_quote_token_to_tez_accuracy "ttx_676" 770tez 1540000000n 770000000n 308000000n

let test_token_to_xtz_677 =
  test_quote_token_to_tez_accuracy "ttx_677" 780tez 780000000n 780000000n 78000000n

let test_token_to_xtz_678 =
  test_quote_token_to_tez_accuracy "ttx_678" 790tez 395000000n 790000000n 79000000n

let test_token_to_xtz_679 =
  test_quote_token_to_tez_accuracy "ttx_679" 800tez 1600000000n 800000000n 80000000n

let test_token_to_xtz_680 =
  test_quote_token_to_tez_accuracy "ttx_680" 810tez 810000000n 810000000n 40500000n

let test_token_to_xtz_681 =
  test_quote_token_to_tez_accuracy "ttx_681" 820tez 410000000n 820000000n 82000000n

let test_token_to_xtz_682 =
  test_quote_token_to_tez_accuracy "ttx_682" 830tez 1660000000n 830000000n 83000000n

let test_token_to_xtz_683 =
  test_quote_token_to_tez_accuracy "ttx_683" 840tez 840000000n 840000000n 84000000n

let test_token_to_xtz_684 =
  test_quote_token_to_tez_accuracy "ttx_684" 850tez 425000000n 850000000n 85000000n

let test_token_to_xtz_685 =
  test_quote_token_to_tez_accuracy "ttx_685" 860tez 1720000000n 860000000n 86000000n

let test_token_to_xtz_686 =
  test_quote_token_to_tez_accuracy "ttx_686" 870tez 870000000n 870000000n 174000000n

let test_token_to_xtz_687 =
  test_quote_token_to_tez_accuracy "ttx_687" 880tez 440000000n 880000000n 88000000n

let test_token_to_xtz_688 =
  test_quote_token_to_tez_accuracy "ttx_688" 890tez 1780000000n 890000000n 89000000n

let test_token_to_xtz_689 =
  test_quote_token_to_tez_accuracy "ttx_689" 900tez 900000000n 900000000n 90000000n

let test_token_to_xtz_690 =
  test_quote_token_to_tez_accuracy "ttx_690" 910tez 455000000n 910000000n 22750000n

let test_token_to_xtz_691 =
  test_quote_token_to_tez_accuracy "ttx_691" 920tez 1840000000n 920000000n 368000000n

let test_token_to_xtz_692 =
  test_quote_token_to_tez_accuracy "ttx_692" 930tez 930000000n 930000000n 93000000n

let test_token_to_xtz_693 =
  test_quote_token_to_tez_accuracy "ttx_693" 940tez 470000000n 940000000n 94000000n

let test_token_to_xtz_694 =
  test_quote_token_to_tez_accuracy "ttx_694" 950tez 1900000000n 950000000n 95000000n

let test_token_to_xtz_695 =
  test_quote_token_to_tez_accuracy "ttx_695" 960tez 960000000n 960000000n 48000000n

let test_token_to_xtz_696 =
  test_quote_token_to_tez_accuracy "ttx_696" 970tez 485000000n 970000000n 97000000n

let test_token_to_xtz_697 =
  test_quote_token_to_tez_accuracy "ttx_697" 980tez 1960000000n 980000000n 98000000n

let test_token_to_xtz_698 =
  test_quote_token_to_tez_accuracy "ttx_698" 990tez 990000000n 990000000n 99000000n

let test_token_to_xtz_699 =
  test_quote_token_to_tez_accuracy "ttx_699" 1000tez 500000000n 1000000000n 100000000n

let test_token_to_xtz_700 =
  test_quote_token_to_tez_accuracy "ttx_700" 10tez 20000000n 10000000n 1000000n

let test_token_to_xtz_701 =
  test_quote_token_to_tez_accuracy "ttx_701" 20tez 20000000n 20000000n 4000000n

let test_token_to_xtz_702 =
  test_quote_token_to_tez_accuracy "ttx_702" 30tez 15000000n 30000000n 3000000n

let test_token_to_xtz_703 =
  test_quote_token_to_tez_accuracy "ttx_703" 40tez 80000000n 40000000n 4000000n

let test_token_to_xtz_704 =
  test_quote_token_to_tez_accuracy "ttx_704" 50tez 50000000n 50000000n 5000000n

let test_token_to_xtz_705 =
  test_quote_token_to_tez_accuracy "ttx_705" 60tez 30000000n 60000000n 1500000n

let test_token_to_xtz_706 =
  test_quote_token_to_tez_accuracy "ttx_706" 70tez 140000000n 70000000n 28000000n

let test_token_to_xtz_707 =
  test_quote_token_to_tez_accuracy "ttx_707" 80tez 80000000n 80000000n 8000000n

let test_token_to_xtz_708 =
  test_quote_token_to_tez_accuracy "ttx_708" 90tez 45000000n 90000000n 9000000n

let test_token_to_xtz_709 =
  test_quote_token_to_tez_accuracy "ttx_709" 100tez 200000000n 100000000n 10000000n

let test_token_to_xtz_710 =
  test_quote_token_to_tez_accuracy "ttx_710" 110tez 110000000n 110000000n 5500000n

let test_token_to_xtz_711 =
  test_quote_token_to_tez_accuracy "ttx_711" 120tez 60000000n 120000000n 12000000n

let test_token_to_xtz_712 =
  test_quote_token_to_tez_accuracy "ttx_712" 130tez 260000000n 130000000n 13000000n

let test_token_to_xtz_713 =
  test_quote_token_to_tez_accuracy "ttx_713" 140tez 140000000n 140000000n 14000000n

let test_token_to_xtz_714 =
  test_quote_token_to_tez_accuracy "ttx_714" 150tez 75000000n 150000000n 15000000n

let test_token_to_xtz_715 =
  test_quote_token_to_tez_accuracy "ttx_715" 160tez 320000000n 160000000n 16000000n

let test_token_to_xtz_716 =
  test_quote_token_to_tez_accuracy "ttx_716" 170tez 170000000n 170000000n 34000000n

let test_token_to_xtz_717 =
  test_quote_token_to_tez_accuracy "ttx_717" 180tez 90000000n 180000000n 18000000n

let test_token_to_xtz_718 =
  test_quote_token_to_tez_accuracy "ttx_718" 190tez 380000000n 190000000n 19000000n

let test_token_to_xtz_719 =
  test_quote_token_to_tez_accuracy "ttx_719" 200tez 200000000n 200000000n 20000000n

let test_token_to_xtz_720 =
  test_quote_token_to_tez_accuracy "ttx_720" 210tez 105000000n 210000000n 5250000n

let test_token_to_xtz_721 =
  test_quote_token_to_tez_accuracy "ttx_721" 220tez 440000000n 220000000n 88000000n

let test_token_to_xtz_722 =
  test_quote_token_to_tez_accuracy "ttx_722" 230tez 230000000n 230000000n 23000000n

let test_token_to_xtz_723 =
  test_quote_token_to_tez_accuracy "ttx_723" 240tez 120000000n 240000000n 24000000n

let test_token_to_xtz_724 =
  test_quote_token_to_tez_accuracy "ttx_724" 250tez 500000000n 250000000n 25000000n

let test_token_to_xtz_725 =
  test_quote_token_to_tez_accuracy "ttx_725" 260tez 260000000n 260000000n 13000000n

let test_token_to_xtz_726 =
  test_quote_token_to_tez_accuracy "ttx_726" 270tez 135000000n 270000000n 27000000n

let test_token_to_xtz_727 =
  test_quote_token_to_tez_accuracy "ttx_727" 280tez 560000000n 280000000n 28000000n

let test_token_to_xtz_728 =
  test_quote_token_to_tez_accuracy "ttx_728" 290tez 290000000n 290000000n 29000000n

let test_token_to_xtz_729 =
  test_quote_token_to_tez_accuracy "ttx_729" 300tez 150000000n 300000000n 30000000n

let test_token_to_xtz_730 =
  test_quote_token_to_tez_accuracy "ttx_730" 310tez 620000000n 310000000n 31000000n

let test_token_to_xtz_731 =
  test_quote_token_to_tez_accuracy "ttx_731" 320tez 320000000n 320000000n 64000000n

let test_token_to_xtz_732 =
  test_quote_token_to_tez_accuracy "ttx_732" 330tez 165000000n 330000000n 33000000n

let test_token_to_xtz_733 =
  test_quote_token_to_tez_accuracy "ttx_733" 340tez 680000000n 340000000n 34000000n

let test_token_to_xtz_734 =
  test_quote_token_to_tez_accuracy "ttx_734" 350tez 350000000n 350000000n 35000000n

let test_token_to_xtz_735 =
  test_quote_token_to_tez_accuracy "ttx_735" 360tez 180000000n 360000000n 9000000n

let test_token_to_xtz_736 =
  test_quote_token_to_tez_accuracy "ttx_736" 370tez 740000000n 370000000n 148000000n

let test_token_to_xtz_737 =
  test_quote_token_to_tez_accuracy "ttx_737" 380tez 380000000n 380000000n 38000000n

let test_token_to_xtz_738 =
  test_quote_token_to_tez_accuracy "ttx_738" 390tez 195000000n 390000000n 39000000n

let test_token_to_xtz_739 =
  test_quote_token_to_tez_accuracy "ttx_739" 400tez 800000000n 400000000n 40000000n

let test_token_to_xtz_740 =
  test_quote_token_to_tez_accuracy "ttx_740" 410tez 410000000n 410000000n 20500000n

let test_token_to_xtz_741 =
  test_quote_token_to_tez_accuracy "ttx_741" 420tez 210000000n 420000000n 42000000n

let test_token_to_xtz_742 =
  test_quote_token_to_tez_accuracy "ttx_742" 430tez 860000000n 430000000n 43000000n

let test_token_to_xtz_743 =
  test_quote_token_to_tez_accuracy "ttx_743" 440tez 440000000n 440000000n 44000000n

let test_token_to_xtz_744 =
  test_quote_token_to_tez_accuracy "ttx_744" 450tez 225000000n 450000000n 45000000n

let test_token_to_xtz_745 =
  test_quote_token_to_tez_accuracy "ttx_745" 460tez 920000000n 460000000n 46000000n

let test_token_to_xtz_746 =
  test_quote_token_to_tez_accuracy "ttx_746" 470tez 470000000n 470000000n 94000000n

let test_token_to_xtz_747 =
  test_quote_token_to_tez_accuracy "ttx_747" 480tez 240000000n 480000000n 48000000n

let test_token_to_xtz_748 =
  test_quote_token_to_tez_accuracy "ttx_748" 490tez 980000000n 490000000n 49000000n

let test_token_to_xtz_749 =
  test_quote_token_to_tez_accuracy "ttx_749" 500tez 500000000n 500000000n 50000000n

let test_token_to_xtz_750 =
  test_quote_token_to_tez_accuracy "ttx_750" 510tez 255000000n 510000000n 12750000n

let test_token_to_xtz_751 =
  test_quote_token_to_tez_accuracy "ttx_751" 520tez 1040000000n 520000000n 208000000n

let test_token_to_xtz_752 =
  test_quote_token_to_tez_accuracy "ttx_752" 530tez 530000000n 530000000n 53000000n

let test_token_to_xtz_753 =
  test_quote_token_to_tez_accuracy "ttx_753" 540tez 270000000n 540000000n 54000000n

let test_token_to_xtz_754 =
  test_quote_token_to_tez_accuracy "ttx_754" 550tez 1100000000n 550000000n 55000000n

let test_token_to_xtz_755 =
  test_quote_token_to_tez_accuracy "ttx_755" 560tez 560000000n 560000000n 28000000n

let test_token_to_xtz_756 =
  test_quote_token_to_tez_accuracy "ttx_756" 570tez 285000000n 570000000n 57000000n

let test_token_to_xtz_757 =
  test_quote_token_to_tez_accuracy "ttx_757" 580tez 1160000000n 580000000n 58000000n

let test_token_to_xtz_758 =
  test_quote_token_to_tez_accuracy "ttx_758" 590tez 590000000n 590000000n 59000000n

let test_token_to_xtz_759 =
  test_quote_token_to_tez_accuracy "ttx_759" 600tez 300000000n 600000000n 60000000n

let test_token_to_xtz_760 =
  test_quote_token_to_tez_accuracy "ttx_760" 610tez 1220000000n 610000000n 61000000n

let test_token_to_xtz_761 =
  test_quote_token_to_tez_accuracy "ttx_761" 420tez 420000000n 420000000n 126000000n

let test_token_to_xtz_762 =
  test_quote_token_to_tez_accuracy "ttx_762" 440tez 110000000n 440000000n 19800000n

let test_token_to_xtz_763 =
  test_quote_token_to_tez_accuracy "ttx_763" 460tez 1840000000n 460000000n 110400000n

let test_token_to_xtz_764 =
  test_quote_token_to_tez_accuracy "ttx_764" 480tez 288000000n 480000000n 57600000n

let test_token_to_xtz_765 =
  test_quote_token_to_tez_accuracy "ttx_765" 500tez 750000000n 500000000n 52500000n

let test_token_to_xtz_766 =
  test_quote_token_to_tez_accuracy "ttx_766" 520tez 520000000n 520000000n 52000000n

let test_token_to_xtz_767 =
  test_quote_token_to_tez_accuracy "ttx_767" 540tez 540000000n 540000000n 54000000n

let test_token_to_xtz_768 =
  test_quote_token_to_tez_accuracy "ttx_768" 560tez 140000000n 560000000n 2800000n

let test_token_to_xtz_769 =
  test_quote_token_to_tez_accuracy "ttx_769" 580tez 2320000000n 580000000n 696000000n

let test_token_to_xtz_770 =
  test_quote_token_to_tez_accuracy "ttx_770" 600tez 360000000n 600000000n 64800000n

let test_token_to_xtz_771 =
  test_quote_token_to_tez_accuracy "ttx_771" 620tez 930000000n 620000000n 55800000n

let test_token_to_xtz_772 =
  test_quote_token_to_tez_accuracy "ttx_772" 640tez 640000000n 640000000n 64000000n

let test_token_to_xtz_773 =
  test_quote_token_to_tez_accuracy "ttx_773" 660tez 660000000n 660000000n 66000000n

let test_token_to_xtz_774 =
  test_quote_token_to_tez_accuracy "ttx_774" 680tez 170000000n 680000000n 13600000n

let test_token_to_xtz_775 =
  test_quote_token_to_tez_accuracy "ttx_775" 700tez 2800000000n 700000000n 336000000n

let test_token_to_xtz_776 =
  test_quote_token_to_tez_accuracy "ttx_776" 720tez 432000000n 720000000n 8640000n

let test_token_to_xtz_777 =
  test_quote_token_to_tez_accuracy "ttx_777" 740tez 1110000000n 740000000n 333000000n

let test_token_to_xtz_778 =
  test_quote_token_to_tez_accuracy "ttx_778" 760tez 760000000n 760000000n 136800000n

let test_token_to_xtz_779 =
  test_quote_token_to_tez_accuracy "ttx_779" 780tez 780000000n 780000000n 46800000n

let test_token_to_xtz_780 =
  test_quote_token_to_tez_accuracy "ttx_780" 800tez 200000000n 800000000n 16000000n

let test_token_to_xtz_781 =
  test_quote_token_to_tez_accuracy "ttx_781" 820tez 3280000000n 820000000n 393600000n

let test_token_to_xtz_782 =
  test_quote_token_to_tez_accuracy "ttx_782" 840tez 504000000n 840000000n 100800000n

let test_token_to_xtz_783 =
  test_quote_token_to_tez_accuracy "ttx_783" 860tez 1290000000n 860000000n 90300000n

let test_token_to_xtz_784 =
  test_quote_token_to_tez_accuracy "ttx_784" 880tez 880000000n 880000000n 17600000n

let test_token_to_xtz_785 =
  test_quote_token_to_tez_accuracy "ttx_785" 900tez 900000000n 900000000n 270000000n

let test_token_to_xtz_786 =
  test_quote_token_to_tez_accuracy "ttx_786" 920tez 230000000n 920000000n 41400000n

let test_token_to_xtz_787 =
  test_quote_token_to_tez_accuracy "ttx_787" 940tez 3760000000n 940000000n 225600000n

let test_token_to_xtz_788 =
  test_quote_token_to_tez_accuracy "ttx_788" 960tez 576000000n 960000000n 115200000n

let test_token_to_xtz_789 =
  test_quote_token_to_tez_accuracy "ttx_789" 980tez 1470000000n 980000000n 102900000n

let test_token_to_xtz_790 =
  test_quote_token_to_tez_accuracy "ttx_790" 1000tez 1000000000n 1000000000n 100000000n

let test_token_to_xtz_791 =
  test_quote_token_to_tez_accuracy "ttx_791" 20tez 20000000n 20000000n 2000000n

let test_token_to_xtz_792 =
  test_quote_token_to_tez_accuracy "ttx_792" 40tez 10000000n 40000000n 200000n

let test_token_to_xtz_793 =
  test_quote_token_to_tez_accuracy "ttx_793" 60tez 240000000n 60000000n 72000000n

let test_token_to_xtz_794 =
  test_quote_token_to_tez_accuracy "ttx_794" 80tez 48000000n 80000000n 8640000n

let test_token_to_xtz_795 =
  test_quote_token_to_tez_accuracy "ttx_795" 100tez 150000000n 100000000n 9000000n

let test_token_to_xtz_796 =
  test_quote_token_to_tez_accuracy "ttx_796" 120tez 120000000n 120000000n 12000000n

let test_token_to_xtz_797 =
  test_quote_token_to_tez_accuracy "ttx_797" 140tez 140000000n 140000000n 14000000n

let test_token_to_xtz_798 =
  test_quote_token_to_tez_accuracy "ttx_798" 160tez 40000000n 160000000n 3200000n

let test_token_to_xtz_799 =
  test_quote_token_to_tez_accuracy "ttx_799" 180tez 720000000n 180000000n 86400000n

let test_token_to_xtz_800 =
  test_quote_token_to_tez_accuracy "ttx_800" 200tez 120000000n 200000000n 2400000n

let test_token_to_xtz_801 =
  test_quote_token_to_tez_accuracy "ttx_801" 220tez 330000000n 220000000n 99000000n

let test_token_to_xtz_802 =
  test_quote_token_to_tez_accuracy "ttx_802" 240tez 240000000n 240000000n 43200000n

let test_token_to_xtz_803 =
  test_quote_token_to_tez_accuracy "ttx_803" 260tez 260000000n 260000000n 15600000n

let test_token_to_xtz_804 =
  test_quote_token_to_tez_accuracy "ttx_804" 280tez 70000000n 280000000n 5600000n

let test_token_to_xtz_805 =
  test_quote_token_to_tez_accuracy "ttx_805" 300tez 1200000000n 300000000n 144000000n

let test_token_to_xtz_806 =
  test_quote_token_to_tez_accuracy "ttx_806" 320tez 192000000n 320000000n 38400000n

let test_token_to_xtz_807 =
  test_quote_token_to_tez_accuracy "ttx_807" 340tez 510000000n 340000000n 35700000n

let test_token_to_xtz_808 =
  test_quote_token_to_tez_accuracy "ttx_808" 360tez 360000000n 360000000n 7200000n

let test_token_to_xtz_809 =
  test_quote_token_to_tez_accuracy "ttx_809" 380tez 380000000n 380000000n 114000000n

let test_token_to_xtz_810 =
  test_quote_token_to_tez_accuracy "ttx_810" 400tez 100000000n 400000000n 18000000n

let test_token_to_xtz_811 =
  test_quote_token_to_tez_accuracy "ttx_811" 420tez 1680000000n 420000000n 100800000n

let test_token_to_xtz_812 =
  test_quote_token_to_tez_accuracy "ttx_812" 440tez 264000000n 440000000n 52800000n

let test_token_to_xtz_813 =
  test_quote_token_to_tez_accuracy "ttx_813" 460tez 690000000n 460000000n 48300000n

let test_token_to_xtz_814 =
  test_quote_token_to_tez_accuracy "ttx_814" 480tez 480000000n 480000000n 48000000n

let test_token_to_xtz_815 =
  test_quote_token_to_tez_accuracy "ttx_815" 500tez 500000000n 500000000n 50000000n

let test_token_to_xtz_816 =
  test_quote_token_to_tez_accuracy "ttx_816" 520tez 130000000n 520000000n 2600000n

let test_token_to_xtz_817 =
  test_quote_token_to_tez_accuracy "ttx_817" 540tez 2160000000n 540000000n 648000000n

let test_token_to_xtz_818 =
  test_quote_token_to_tez_accuracy "ttx_818" 560tez 336000000n 560000000n 60480000n

let test_token_to_xtz_819 =
  test_quote_token_to_tez_accuracy "ttx_819" 580tez 870000000n 580000000n 52200000n

let test_token_to_xtz_820 =
  test_quote_token_to_tez_accuracy "ttx_820" 600tez 600000000n 600000000n 60000000n

let test_token_to_xtz_821 =
  test_quote_token_to_tez_accuracy "ttx_821" 620tez 620000000n 620000000n 62000000n

let test_token_to_xtz_822 =
  test_quote_token_to_tez_accuracy "ttx_822" 640tez 160000000n 640000000n 12800000n

let test_token_to_xtz_823 =
  test_quote_token_to_tez_accuracy "ttx_823" 660tez 2640000000n 660000000n 316800000n

let test_token_to_xtz_824 =
  test_quote_token_to_tez_accuracy "ttx_824" 680tez 408000000n 680000000n 8160000n

let test_token_to_xtz_825 =
  test_quote_token_to_tez_accuracy "ttx_825" 700tez 1050000000n 700000000n 315000000n

let test_token_to_xtz_826 =
  test_quote_token_to_tez_accuracy "ttx_826" 720tez 720000000n 720000000n 129600000n

let test_token_to_xtz_827 =
  test_quote_token_to_tez_accuracy "ttx_827" 740tez 740000000n 740000000n 44400000n

let test_token_to_xtz_828 =
  test_quote_token_to_tez_accuracy "ttx_828" 760tez 190000000n 760000000n 15200000n

let test_token_to_xtz_829 =
  test_quote_token_to_tez_accuracy "ttx_829" 780tez 3120000000n 780000000n 374400000n

let test_token_to_xtz_830 =
  test_quote_token_to_tez_accuracy "ttx_830" 800tez 480000000n 800000000n 96000000n

let test_token_to_xtz_831 =
  test_quote_token_to_tez_accuracy "ttx_831" 820tez 1230000000n 820000000n 86100000n

let test_token_to_xtz_832 =
  test_quote_token_to_tez_accuracy "ttx_832" 840tez 840000000n 840000000n 16800000n

let test_token_to_xtz_833 =
  test_quote_token_to_tez_accuracy "ttx_833" 860tez 860000000n 860000000n 258000000n

let test_token_to_xtz_834 =
  test_quote_token_to_tez_accuracy "ttx_834" 880tez 220000000n 880000000n 39600000n

let test_token_to_xtz_835 =
  test_quote_token_to_tez_accuracy "ttx_835" 900tez 3600000000n 900000000n 216000000n

let test_token_to_xtz_836 =
  test_quote_token_to_tez_accuracy "ttx_836" 920tez 552000000n 920000000n 110400000n

let test_token_to_xtz_837 =
  test_quote_token_to_tez_accuracy "ttx_837" 940tez 1410000000n 940000000n 98700000n

let test_token_to_xtz_838 =
  test_quote_token_to_tez_accuracy "ttx_838" 960tez 960000000n 960000000n 96000000n

let test_token_to_xtz_839 =
  test_quote_token_to_tez_accuracy "ttx_839" 980tez 980000000n 980000000n 98000000n

let test_token_to_xtz_840 =
  test_quote_token_to_tez_accuracy "ttx_840" 1000tez 250000000n 1000000000n 5000000n

let test_token_to_xtz_841 =
  test_quote_token_to_tez_accuracy "ttx_841" 20tez 80000000n 20000000n 24000000n

let test_token_to_xtz_842 =
  test_quote_token_to_tez_accuracy "ttx_842" 40tez 24000000n 40000000n 4320000n

let test_token_to_xtz_843 =
  test_quote_token_to_tez_accuracy "ttx_843" 60tez 90000000n 60000000n 5400000n

let test_token_to_xtz_844 =
  test_quote_token_to_tez_accuracy "ttx_844" 80tez 80000000n 80000000n 8000000n

let test_token_to_xtz_845 =
  test_quote_token_to_tez_accuracy "ttx_845" 100tez 100000000n 100000000n 10000000n

let test_token_to_xtz_846 =
  test_quote_token_to_tez_accuracy "ttx_846" 120tez 30000000n 120000000n 2400000n

let test_token_to_xtz_847 =
  test_quote_token_to_tez_accuracy "ttx_847" 140tez 560000000n 140000000n 67200000n

let test_token_to_xtz_848 =
  test_quote_token_to_tez_accuracy "ttx_848" 160tez 96000000n 160000000n 1920000n

let test_token_to_xtz_849 =
  test_quote_token_to_tez_accuracy "ttx_849" 180tez 270000000n 180000000n 81000000n

let test_token_to_xtz_850 =
  test_quote_token_to_tez_accuracy "ttx_850" 200tez 200000000n 200000000n 36000000n

let test_token_to_xtz_851 =
  test_quote_token_to_tez_accuracy "ttx_851" 220tez 220000000n 220000000n 13200000n

let test_token_to_xtz_852 =
  test_quote_token_to_tez_accuracy "ttx_852" 240tez 60000000n 240000000n 4800000n

let test_token_to_xtz_853 =
  test_quote_token_to_tez_accuracy "ttx_853" 260tez 1040000000n 260000000n 124800000n

let test_token_to_xtz_854 =
  test_quote_token_to_tez_accuracy "ttx_854" 280tez 168000000n 280000000n 33600000n

let test_token_to_xtz_855 =
  test_quote_token_to_tez_accuracy "ttx_855" 300tez 450000000n 300000000n 31500000n

let test_token_to_xtz_856 =
  test_quote_token_to_tez_accuracy "ttx_856" 320tez 320000000n 320000000n 6400000n

let test_token_to_xtz_857 =
  test_quote_token_to_tez_accuracy "ttx_857" 340tez 340000000n 340000000n 102000000n

let test_token_to_xtz_858 =
  test_quote_token_to_tez_accuracy "ttx_858" 360tez 90000000n 360000000n 16200000n

let test_token_to_xtz_859 =
  test_quote_token_to_tez_accuracy "ttx_859" 380tez 1520000000n 380000000n 91200000n

let test_token_to_xtz_860 =
  test_quote_token_to_tez_accuracy "ttx_860" 400tez 240000000n 400000000n 48000000n

let test_token_to_xtz_861 =
  test_quote_token_to_tez_accuracy "ttx_861" 420tez 630000000n 420000000n 44100000n

let test_token_to_xtz_862 =
  test_quote_token_to_tez_accuracy "ttx_862" 440tez 440000000n 440000000n 44000000n

let test_token_to_xtz_863 =
  test_quote_token_to_tez_accuracy "ttx_863" 460tez 460000000n 460000000n 46000000n

let test_token_to_xtz_864 =
  test_quote_token_to_tez_accuracy "ttx_864" 480tez 120000000n 480000000n 2400000n

let test_token_to_xtz_865 =
  test_quote_token_to_tez_accuracy "ttx_865" 500tez 2000000000n 500000000n 600000000n

let test_token_to_xtz_866 =
  test_quote_token_to_tez_accuracy "ttx_866" 520tez 312000000n 520000000n 56160000n

let test_token_to_xtz_867 =
  test_quote_token_to_tez_accuracy "ttx_867" 540tez 810000000n 540000000n 48600000n

let test_token_to_xtz_868 =
  test_quote_token_to_tez_accuracy "ttx_868" 560tez 560000000n 560000000n 56000000n

let test_token_to_xtz_869 =
  test_quote_token_to_tez_accuracy "ttx_869" 580tez 580000000n 580000000n 58000000n

let test_token_to_xtz_870 =
  test_quote_token_to_tez_accuracy "ttx_870" 600tez 150000000n 600000000n 12000000n

let test_token_to_xtz_871 =
  test_quote_token_to_tez_accuracy "ttx_871" 620tez 2480000000n 620000000n 297600000n

let test_token_to_xtz_872 =
  test_quote_token_to_tez_accuracy "ttx_872" 640tez 384000000n 640000000n 7680000n

let test_token_to_xtz_873 =
  test_quote_token_to_tez_accuracy "ttx_873" 660tez 990000000n 660000000n 297000000n

let test_token_to_xtz_874 =
  test_quote_token_to_tez_accuracy "ttx_874" 680tez 680000000n 680000000n 122400000n

let test_token_to_xtz_875 =
  test_quote_token_to_tez_accuracy "ttx_875" 700tez 700000000n 700000000n 42000000n

let test_token_to_xtz_876 =
  test_quote_token_to_tez_accuracy "ttx_876" 720tez 180000000n 720000000n 14400000n

let test_token_to_xtz_877 =
  test_quote_token_to_tez_accuracy "ttx_877" 740tez 2960000000n 740000000n 355200000n

let test_token_to_xtz_878 =
  test_quote_token_to_tez_accuracy "ttx_878" 760tez 456000000n 760000000n 91200000n

let test_token_to_xtz_879 =
  test_quote_token_to_tez_accuracy "ttx_879" 780tez 1170000000n 780000000n 81900000n

let test_token_to_xtz_880 =
  test_quote_token_to_tez_accuracy "ttx_880" 800tez 800000000n 800000000n 16000000n

let test_token_to_xtz_881 =
  test_quote_token_to_tez_accuracy "ttx_881" 820tez 820000000n 820000000n 246000000n

let test_token_to_xtz_882 =
  test_quote_token_to_tez_accuracy "ttx_882" 840tez 210000000n 840000000n 37800000n

let test_token_to_xtz_883 =
  test_quote_token_to_tez_accuracy "ttx_883" 860tez 3440000000n 860000000n 206400000n

let test_token_to_xtz_884 =
  test_quote_token_to_tez_accuracy "ttx_884" 880tez 528000000n 880000000n 105600000n

let test_token_to_xtz_885 =
  test_quote_token_to_tez_accuracy "ttx_885" 900tez 1350000000n 900000000n 94500000n

let test_token_to_xtz_886 =
  test_quote_token_to_tez_accuracy "ttx_886" 920tez 920000000n 920000000n 92000000n

let test_token_to_xtz_887 =
  test_quote_token_to_tez_accuracy "ttx_887" 940tez 940000000n 940000000n 94000000n

let test_token_to_xtz_888 =
  test_quote_token_to_tez_accuracy "ttx_888" 960tez 240000000n 960000000n 4800000n

let test_token_to_xtz_889 =
  test_quote_token_to_tez_accuracy "ttx_889" 980tez 3920000000n 980000000n 1176000000n

let test_token_to_xtz_890 =
  test_quote_token_to_tez_accuracy "ttx_890" 1000tez 600000000n 1000000000n 108000000n

let test_token_to_xtz_891 =
  test_quote_token_to_tez_accuracy "ttx_891" 20tez 30000000n 20000000n 1800000n

let test_token_to_xtz_892 =
  test_quote_token_to_tez_accuracy "ttx_892" 40tez 40000000n 40000000n 4000000n

let test_token_to_xtz_893 =
  test_quote_token_to_tez_accuracy "ttx_893" 60tez 60000000n 60000000n 6000000n

let test_token_to_xtz_894 =
  test_quote_token_to_tez_accuracy "ttx_894" 80tez 20000000n 80000000n 1600000n

let test_token_to_xtz_895 =
  test_quote_token_to_tez_accuracy "ttx_895" 100tez 400000000n 100000000n 48000000n

let test_token_to_xtz_896 =
  test_quote_token_to_tez_accuracy "ttx_896" 120tez 72000000n 120000000n 1440000n

let test_token_to_xtz_897 =
  test_quote_token_to_tez_accuracy "ttx_897" 140tez 210000000n 140000000n 63000000n

let test_token_to_xtz_898 =
  test_quote_token_to_tez_accuracy "ttx_898" 160tez 160000000n 160000000n 28800000n

let test_token_to_xtz_899 =
  test_quote_token_to_tez_accuracy "ttx_899" 180tez 180000000n 180000000n 10800000n

let test_token_to_xtz_900 =
  test_quote_token_to_tez_accuracy "ttx_900" 200tez 50000000n 200000000n 4000000n

let test_token_to_xtz_901 =
  test_quote_token_to_tez_accuracy "ttx_901" 220tez 880000000n 220000000n 105600000n

let test_token_to_xtz_902 =
  test_quote_token_to_tez_accuracy "ttx_902" 240tez 144000000n 240000000n 28800000n

let test_token_to_xtz_903 =
  test_quote_token_to_tez_accuracy "ttx_903" 260tez 390000000n 260000000n 27300000n

let test_token_to_xtz_904 =
  test_quote_token_to_tez_accuracy "ttx_904" 280tez 280000000n 280000000n 5600000n

let test_token_to_xtz_905 =
  test_quote_token_to_tez_accuracy "ttx_905" 300tez 300000000n 300000000n 90000000n

let test_token_to_xtz_906 =
  test_quote_token_to_tez_accuracy "ttx_906" 320tez 80000000n 320000000n 14400000n

let test_token_to_xtz_907 =
  test_quote_token_to_tez_accuracy "ttx_907" 340tez 1360000000n 340000000n 81600000n

let test_token_to_xtz_908 =
  test_quote_token_to_tez_accuracy "ttx_908" 360tez 216000000n 360000000n 43200000n

let test_token_to_xtz_909 =
  test_quote_token_to_tez_accuracy "ttx_909" 380tez 570000000n 380000000n 39900000n

let test_token_to_xtz_910 =
  test_quote_token_to_tez_accuracy "ttx_910" 400tez 400000000n 400000000n 40000000n

let test_token_to_xtz_911 =
  test_quote_token_to_tez_accuracy "ttx_911" 420tez 420000000n 420000000n 42000000n

let test_token_to_xtz_912 =
  test_quote_token_to_tez_accuracy "ttx_912" 440tez 110000000n 440000000n 2200000n

let test_token_to_xtz_913 =
  test_quote_token_to_tez_accuracy "ttx_913" 460tez 1840000000n 460000000n 552000000n

let test_token_to_xtz_914 =
  test_quote_token_to_tez_accuracy "ttx_914" 480tez 288000000n 480000000n 51840000n

let test_token_to_xtz_915 =
  test_quote_token_to_tez_accuracy "ttx_915" 500tez 750000000n 500000000n 45000000n

let test_token_to_xtz_916 =
  test_quote_token_to_tez_accuracy "ttx_916" 520tez 520000000n 520000000n 52000000n

let test_token_to_xtz_917 =
  test_quote_token_to_tez_accuracy "ttx_917" 540tez 540000000n 540000000n 54000000n

let test_token_to_xtz_918 =
  test_quote_token_to_tez_accuracy "ttx_918" 560tez 140000000n 560000000n 11200000n

let test_token_to_xtz_919 =
  test_quote_token_to_tez_accuracy "ttx_919" 580tez 2320000000n 580000000n 278400000n

let test_token_to_xtz_920 =
  test_quote_token_to_tez_accuracy "ttx_920" 600tez 360000000n 600000000n 7200000n

let test_token_to_xtz_921 =
  test_quote_token_to_tez_accuracy "ttx_921" 620tez 930000000n 620000000n 279000000n

let test_token_to_xtz_922 =
  test_quote_token_to_tez_accuracy "ttx_922" 640tez 640000000n 640000000n 115200000n

let test_token_to_xtz_923 =
  test_quote_token_to_tez_accuracy "ttx_923" 660tez 660000000n 660000000n 39600000n

let test_token_to_xtz_924 =
  test_quote_token_to_tez_accuracy "ttx_924" 680tez 170000000n 680000000n 13600000n

let test_token_to_xtz_925 =
  test_quote_token_to_tez_accuracy "ttx_925" 700tez 2800000000n 700000000n 336000000n

let test_token_to_xtz_926 =
  test_quote_token_to_tez_accuracy "ttx_926" 720tez 432000000n 720000000n 86400000n

let test_token_to_xtz_927 =
  test_quote_token_to_tez_accuracy "ttx_927" 740tez 1110000000n 740000000n 77700000n

let test_token_to_xtz_928 =
  test_quote_token_to_tez_accuracy "ttx_928" 760tez 760000000n 760000000n 15200000n

let test_token_to_xtz_929 =
  test_quote_token_to_tez_accuracy "ttx_929" 780tez 780000000n 780000000n 234000000n

let test_token_to_xtz_930 =
  test_quote_token_to_tez_accuracy "ttx_930" 800tez 200000000n 800000000n 36000000n

let test_token_to_xtz_931 =
  test_quote_token_to_tez_accuracy "ttx_931" 820tez 3280000000n 820000000n 196800000n

let test_token_to_xtz_932 =
  test_quote_token_to_tez_accuracy "ttx_932" 840tez 504000000n 840000000n 100800000n

let test_token_to_xtz_933 =
  test_quote_token_to_tez_accuracy "ttx_933" 860tez 1290000000n 860000000n 90300000n

let test_token_to_xtz_934 =
  test_quote_token_to_tez_accuracy "ttx_934" 880tez 880000000n 880000000n 88000000n

let test_token_to_xtz_935 =
  test_quote_token_to_tez_accuracy "ttx_935" 900tez 900000000n 900000000n 90000000n

let test_token_to_xtz_936 =
  test_quote_token_to_tez_accuracy "ttx_936" 920tez 230000000n 920000000n 4600000n

let test_token_to_xtz_937 =
  test_quote_token_to_tez_accuracy "ttx_937" 940tez 3760000000n 940000000n 1128000000n

let test_token_to_xtz_938 =
  test_quote_token_to_tez_accuracy "ttx_938" 960tez 576000000n 960000000n 103680000n

let test_token_to_xtz_939 =
  test_quote_token_to_tez_accuracy "ttx_939" 980tez 1470000000n 980000000n 88200000n

let test_token_to_xtz_940 =
  test_quote_token_to_tez_accuracy "ttx_940" 1000tez 1000000000n 1000000000n 100000000n

let test_token_to_xtz_941 =
  test_quote_token_to_tez_accuracy "ttx_941" 20tez 20000000n 20000000n 2000000n

let test_token_to_xtz_942 =
  test_quote_token_to_tez_accuracy "ttx_942" 40tez 10000000n 40000000n 800000n

let test_token_to_xtz_943 =
  test_quote_token_to_tez_accuracy "ttx_943" 60tez 240000000n 60000000n 28800000n

let test_token_to_xtz_944 =
  test_quote_token_to_tez_accuracy "ttx_944" 80tez 48000000n 80000000n 960000n

let test_token_to_xtz_945 =
  test_quote_token_to_tez_accuracy "ttx_945" 100tez 150000000n 100000000n 45000000n

let test_token_to_xtz_946 =
  test_quote_token_to_tez_accuracy "ttx_946" 120tez 120000000n 120000000n 21600000n

let test_token_to_xtz_947 =
  test_quote_token_to_tez_accuracy "ttx_947" 140tez 140000000n 140000000n 8400000n

let test_token_to_xtz_948 =
  test_quote_token_to_tez_accuracy "ttx_948" 160tez 40000000n 160000000n 3200000n

let test_token_to_xtz_949 =
  test_quote_token_to_tez_accuracy "ttx_949" 180tez 720000000n 180000000n 86400000n

let test_token_to_xtz_950 =
  test_quote_token_to_tez_accuracy "ttx_950" 200tez 120000000n 200000000n 24000000n

let test_token_to_xtz_951 =
  test_quote_token_to_tez_accuracy "ttx_951" 220tez 330000000n 220000000n 23100000n

let test_token_to_xtz_952 =
  test_quote_token_to_tez_accuracy "ttx_952" 240tez 240000000n 240000000n 4800000n

let test_token_to_xtz_953 =
  test_quote_token_to_tez_accuracy "ttx_953" 260tez 260000000n 260000000n 78000000n

let test_token_to_xtz_954 =
  test_quote_token_to_tez_accuracy "ttx_954" 280tez 70000000n 280000000n 12600000n

let test_token_to_xtz_955 =
  test_quote_token_to_tez_accuracy "ttx_955" 300tez 1200000000n 300000000n 72000000n

let test_token_to_xtz_956 =
  test_quote_token_to_tez_accuracy "ttx_956" 320tez 192000000n 320000000n 38400000n

let test_token_to_xtz_957 =
  test_quote_token_to_tez_accuracy "ttx_957" 340tez 510000000n 340000000n 35700000n

let test_token_to_xtz_958 =
  test_quote_token_to_tez_accuracy "ttx_958" 360tez 360000000n 360000000n 36000000n

let test_token_to_xtz_959 =
  test_quote_token_to_tez_accuracy "ttx_959" 380tez 380000000n 380000000n 38000000n

let test_token_to_xtz_960 =
  test_quote_token_to_tez_accuracy "ttx_960" 400tez 100000000n 400000000n 2000000n

let test_token_to_xtz_961 =
  test_quote_token_to_tez_accuracy "ttx_961" 420tez 1680000000n 420000000n 504000000n

let test_token_to_xtz_962 =
  test_quote_token_to_tez_accuracy "ttx_962" 440tez 264000000n 440000000n 47520000n

let test_token_to_xtz_963 =
  test_quote_token_to_tez_accuracy "ttx_963" 460tez 690000000n 460000000n 41400000n

let test_token_to_xtz_964 =
  test_quote_token_to_tez_accuracy "ttx_964" 480tez 480000000n 480000000n 48000000n

let test_token_to_xtz_965 =
  test_quote_token_to_tez_accuracy "ttx_965" 500tez 500000000n 500000000n 50000000n

let test_token_to_xtz_966 =
  test_quote_token_to_tez_accuracy "ttx_966" 520tez 130000000n 520000000n 10400000n

let test_token_to_xtz_967 =
  test_quote_token_to_tez_accuracy "ttx_967" 540tez 2160000000n 540000000n 259200000n

let test_token_to_xtz_968 =
  test_quote_token_to_tez_accuracy "ttx_968" 560tez 336000000n 560000000n 6720000n

let test_token_to_xtz_969 =
  test_quote_token_to_tez_accuracy "ttx_969" 580tez 870000000n 580000000n 261000000n

let test_token_to_xtz_970 =
  test_quote_token_to_tez_accuracy "ttx_970" 600tez 600000000n 600000000n 108000000n

let test_token_to_xtz_971 =
  test_quote_token_to_tez_accuracy "ttx_971" 620tez 620000000n 620000000n 37200000n

let test_token_to_xtz_972 =
  test_quote_token_to_tez_accuracy "ttx_972" 640tez 160000000n 640000000n 12800000n

let test_token_to_xtz_973 =
  test_quote_token_to_tez_accuracy "ttx_973" 660tez 2640000000n 660000000n 316800000n

let test_token_to_xtz_974 =
  test_quote_token_to_tez_accuracy "ttx_974" 680tez 408000000n 680000000n 81600000n

let test_token_to_xtz_975 =
  test_quote_token_to_tez_accuracy "ttx_975" 700tez 1050000000n 700000000n 73500000n

let test_token_to_xtz_976 =
  test_quote_token_to_tez_accuracy "ttx_976" 720tez 720000000n 720000000n 14400000n

let test_token_to_xtz_977 =
  test_quote_token_to_tez_accuracy "ttx_977" 740tez 740000000n 740000000n 222000000n

let test_token_to_xtz_978 =
  test_quote_token_to_tez_accuracy "ttx_978" 760tez 190000000n 760000000n 34200000n

let test_token_to_xtz_979 =
  test_quote_token_to_tez_accuracy "ttx_979" 780tez 3120000000n 780000000n 187200000n

let test_token_to_xtz_980 =
  test_quote_token_to_tez_accuracy "ttx_980" 800tez 480000000n 800000000n 96000000n

let test_token_to_xtz_981 =
  test_quote_token_to_tez_accuracy "ttx_981" 820tez 1230000000n 820000000n 86100000n

let test_token_to_xtz_982 =
  test_quote_token_to_tez_accuracy "ttx_982" 840tez 840000000n 840000000n 84000000n

let test_token_to_xtz_983 =
  test_quote_token_to_tez_accuracy "ttx_983" 860tez 860000000n 860000000n 86000000n

let test_token_to_xtz_984 =
  test_quote_token_to_tez_accuracy "ttx_984" 880tez 220000000n 880000000n 4400000n

let test_token_to_xtz_985 =
  test_quote_token_to_tez_accuracy "ttx_985" 900tez 3600000000n 900000000n 1080000000n

let test_token_to_xtz_986 =
  test_quote_token_to_tez_accuracy "ttx_986" 920tez 552000000n 920000000n 99360000n

let test_token_to_xtz_987 =
  test_quote_token_to_tez_accuracy "ttx_987" 940tez 1410000000n 940000000n 84600000n

let test_token_to_xtz_988 =
  test_quote_token_to_tez_accuracy "ttx_988" 960tez 960000000n 960000000n 96000000n

let test_token_to_xtz_989 =
  test_quote_token_to_tez_accuracy "ttx_989" 980tez 980000000n 980000000n 98000000n

let test_token_to_xtz_990 =
  test_quote_token_to_tez_accuracy "ttx_990" 1000tez 250000000n 1000000000n 20000000n

let test_token_to_xtz_991 =
  test_quote_token_to_tez_accuracy "ttx_991" 20tez 80000000n 20000000n 9600000n

let test_token_to_xtz_992 =
  test_quote_token_to_tez_accuracy "ttx_992" 40tez 24000000n 40000000n 480000n

let test_token_to_xtz_993 =
  test_quote_token_to_tez_accuracy "ttx_993" 60tez 90000000n 60000000n 27000000n

let test_token_to_xtz_994 =
  test_quote_token_to_tez_accuracy "ttx_994" 80tez 80000000n 80000000n 14400000n

let test_token_to_xtz_995 =
  test_quote_token_to_tez_accuracy "ttx_995" 100tez 100000000n 100000000n 6000000n

let test_token_to_xtz_996 =
  test_quote_token_to_tez_accuracy "ttx_996" 120tez 30000000n 120000000n 2400000n

let test_token_to_xtz_997 =
  test_quote_token_to_tez_accuracy "ttx_997" 140tez 560000000n 140000000n 67200000n

let test_token_to_xtz_998 =
  test_quote_token_to_tez_accuracy "ttx_998" 160tez 96000000n 160000000n 19200000n

let test_token_to_xtz_999 =
  test_quote_token_to_tez_accuracy "ttx_999" 180tez 270000000n 180000000n 18900000n

let test_token_to_xtz_1000 =
  test_quote_token_to_tez_accuracy "ttx_1000" 200tez 200000000n 200000000n 4000000n

(*****************************************************************************)
(* Token to XTZ - Unusual/Fractional Inputs (1001-1100)                    *)
(*****************************************************************************)
let test_token_to_xtz_1001 = test_quote_token_to_tez_accuracy "ttx_1001" 0.002tez 2000n 2000n 4n

let test_token_to_xtz_1002 = test_quote_token_to_tez_accuracy "ttx_1002" 0.005tez 5000n 5000n 15n

let test_token_to_xtz_1003 = test_quote_token_to_tez_accuracy "ttx_1003" 0.009tez 18000n 18000n 90n

let test_token_to_xtz_1004 = test_quote_token_to_tez_accuracy "ttx_1004" 0.017tez 51000n 51000n 357n

let test_token_to_xtz_1005 = test_quote_token_to_tez_accuracy "ttx_1005" 0.021tez 21000n 21000n 231n

let test_token_to_xtz_1006 = test_quote_token_to_tez_accuracy "ttx_1006" 0.027tez 54000n 54000n 702n

let test_token_to_xtz_1007 =
  test_quote_token_to_tez_accuracy "ttx_1007" 0.033tez 99000n 99000n 1683n

let test_token_to_xtz_1008 = test_quote_token_to_tez_accuracy "ttx_1008" 0.039tez 39000n 39000n 741n

let test_token_to_xtz_1009 =
  test_quote_token_to_tez_accuracy "ttx_1009" 0.043tez 86000n 86000n 1978n

let test_token_to_xtz_1010 =
  test_quote_token_to_tez_accuracy "ttx_1010" 0.051tez 153000n 153000n 4437n

let test_token_to_xtz_1011 = test_quote_token_to_tez_accuracy "ttx_1011" 0.057tez 0n 0n 0n

let test_token_to_xtz_1012 = test_quote_token_to_tez_accuracy "ttx_1012" 0.063tez 0n 0n 0n

let test_token_to_xtz_1013 =
  test_quote_token_to_tez_accuracy "ttx_1013" 0.069tez 483000n 483000n 19803n

let test_token_to_xtz_1014 =
  test_quote_token_to_tez_accuracy "ttx_1014" 0.06tez 450000n 450000n 19350n

let test_token_to_xtz_1015 =
  test_quote_token_to_tez_accuracy "ttx_1015" 0.081tez 405000n 405000n 19035n

let test_token_to_xtz_1016 =
  test_quote_token_to_tez_accuracy "ttx_1016" 0.087tez 348000n 348000n 18444n

let test_token_to_xtz_1017 =
  test_quote_token_to_tez_accuracy "ttx_1017" 0.093tez 279000n 279000n 16461n

let test_token_to_xtz_1018 =
  test_quote_token_to_tez_accuracy "ttx_1018" 0.099tez 198000n 198000n 12078n

let test_token_to_xtz_1019 =
  test_quote_token_to_tez_accuracy "ttx_1019" 1.357tez 1357000n 1357000n 90919n

let test_token_to_xtz_1020 =
  test_quote_token_to_tez_accuracy "ttx_1020" 2.468tez 2468000n 2468000n 175227n

let test_token_to_xtz_1021 =
  test_quote_token_to_tez_accuracy "ttx_1021" 3.579tez 7158000n 7158000n 522533n

let test_token_to_xtz_1022 =
  test_quote_token_to_tez_accuracy "ttx_1022" 4.68tez 14040000n 14040000n 1109160n

let test_token_to_xtz_1023 =
  test_quote_token_to_tez_accuracy "ttx_1023" 5.791tez 5791000n 5791000n 480653n

let test_token_to_xtz_1024 =
  test_quote_token_to_tez_accuracy "ttx_1024" 6.802tez 13604000n 13604000n 1210756n

let test_token_to_xtz_1025 =
  test_quote_token_to_tez_accuracy "ttx_1025" 7.913tez 23739000n 23739000n 2302683n

let test_token_to_xtz_1026 =
  test_quote_token_to_tez_accuracy "ttx_1026" 8.024tez 8023999n 8023999n 810423n

let test_token_to_xtz_1027 =
  test_quote_token_to_tez_accuracy "ttx_1027" 9.135tez 18270000n 18270000n 1881810n

let test_token_to_xtz_1028 =
  test_quote_token_to_tez_accuracy "ttx_1028" 1.011tez 3032997n 3032997n 324530n

let test_token_to_xtz_1029 = test_quote_token_to_tez_accuracy "ttx_1029" 2.022tez 0n 0n 0n

let test_token_to_xtz_1030 = test_quote_token_to_tez_accuracy "ttx_1030" 3.033tez 0n 0n 0n

let test_token_to_xtz_1031 =
  test_quote_token_to_tez_accuracy "ttx_1031" 4.044tez 28307993n 28307993n 3595115n

let test_token_to_xtz_1032 =
  test_quote_token_to_tez_accuracy "ttx_1032" 5.055tez 30330000n 30330000n 3973230n

let test_token_to_xtz_1033 =
  test_quote_token_to_tez_accuracy "ttx_1033" 6.066tez 30330000n 30330000n 4155210n

let test_token_to_xtz_1034 =
  test_quote_token_to_tez_accuracy "ttx_1034" 7.077tez 28308000n 28308000n 3934812n

let test_token_to_xtz_1035 =
  test_quote_token_to_tez_accuracy "ttx_1035" 8.088tez 24263997n 24263997n 3615335n

let test_token_to_xtz_1036 =
  test_quote_token_to_tez_accuracy "ttx_1036" 9.099tez 18198000n 18198000n 2747898n

let test_token_to_xtz_1037 =
  test_quote_token_to_tez_accuracy "ttx_1037" 0.271tez 271000n 271000n 42547n

let test_token_to_xtz_1038 =
  test_quote_token_to_tez_accuracy "ttx_1038" 1.618tez 1618000n 1618000n 263734n

let test_token_to_xtz_1039 =
  test_quote_token_to_tez_accuracy "ttx_1039" 2.414tez 4828000n 4828000n 806276n

let test_token_to_xtz_1040 =
  test_quote_token_to_tez_accuracy "ttx_1040" 3.732tez 11196000n 11196000n 1936907n

let test_token_to_xtz_1041 =
  test_quote_token_to_tez_accuracy "ttx_1041" 1.111tez 1111000n 1111000n 198869n

let test_token_to_xtz_1042 =
  test_quote_token_to_tez_accuracy "ttx_1042" 2.222tez 4444000n 4444000n 804364n

let test_token_to_xtz_1043 =
  test_quote_token_to_tez_accuracy "ttx_1043" 3.333tez 9999000n 9999000n 1909809n

let test_token_to_xtz_1044 =
  test_quote_token_to_tez_accuracy "ttx_1044" 4.444tez 4444000n 4444000n 857692n

let test_token_to_xtz_1045 =
  test_quote_token_to_tez_accuracy "ttx_1045" 11.223tez 22446000n 22446000n 4421862n

let test_token_to_xtz_1046 =
  test_quote_token_to_tez_accuracy "ttx_1046" 22.334tez 67002000n 67002000n 13333398n

let test_token_to_xtz_1047 = test_quote_token_to_tez_accuracy "ttx_1047" 33.445tez 0n 0n 0n

let test_token_to_xtz_1048 = test_quote_token_to_tez_accuracy "ttx_1048" 44.556tez 0n 0n 0n

let test_token_to_xtz_1049 =
  test_quote_token_to_tez_accuracy "ttx_1049" 55.667tez 389669000n 389669000n 779338n

let test_token_to_xtz_1050 =
  test_quote_token_to_tez_accuracy "ttx_1050" 66.778tez 400668000n 400668000n 1202004n

let test_token_to_xtz_1051 =
  test_quote_token_to_tez_accuracy "ttx_1051" 77.889tez 389445000n 389445000n 1947225n

let test_token_to_xtz_1052 =
  test_quote_token_to_tez_accuracy "ttx_1052" 88.99tez 355960000n 355960000n 2491720n

let test_token_to_xtz_1053 =
  test_quote_token_to_tez_accuracy "ttx_1053" 13.131tez 39393000n 39393000n 433323n

let test_token_to_xtz_1054 =
  test_quote_token_to_tez_accuracy "ttx_1054" 24.242tez 48484000n 48484000n 630292n

let test_token_to_xtz_1055 =
  test_quote_token_to_tez_accuracy "ttx_1055" 35.353tez 35353000n 35353000n 601001n

let test_token_to_xtz_1056 =
  test_quote_token_to_tez_accuracy "ttx_1056" 46.464tez 46464000n 46464000n 882816n

let test_token_to_xtz_1057 =
  test_quote_token_to_tez_accuracy "ttx_1057" 46.06tez 115150000n 115150000n 2648450n

let test_token_to_xtz_1058 =
  test_quote_token_to_tez_accuracy "ttx_1058" 68.686tez 206058000n 206058000n 5975682n

let test_token_to_xtz_1059 =
  test_quote_token_to_tez_accuracy "ttx_1059" 79.797tez 79797000n 79797000n 2473707n

let test_token_to_xtz_1060 =
  test_quote_token_to_tez_accuracy "ttx_1060" 80.808tez 161616000n 161616000n 5979792n

let test_token_to_xtz_1061 =
  test_quote_token_to_tez_accuracy "ttx_1061" 15.789tez 47367000n 47367000n 1942047n

let test_token_to_xtz_1062 =
  test_quote_token_to_tez_accuracy "ttx_1062" 26.89tez 26890000n 26890000n 1156270n

let test_token_to_xtz_1063 =
  test_quote_token_to_tez_accuracy "ttx_1063" 37.901tez 75802000n 75802000n 3562694n

let test_token_to_xtz_1064 =
  test_quote_token_to_tez_accuracy "ttx_1064" 48.012tez 144036000n 144036000n 7633908n

let test_token_to_xtz_1065 = test_quote_token_to_tez_accuracy "ttx_1065" 59.123tez 0n 0n 0n

let test_token_to_xtz_1066 = test_quote_token_to_tez_accuracy "ttx_1066" 60.234tez 0n 0n 0n

let test_token_to_xtz_1067 =
  test_quote_token_to_tez_accuracy "ttx_1067" 71.345tez 499415000n 499415000n 33460805n

let test_token_to_xtz_1068 =
  test_quote_token_to_tez_accuracy "ttx_1068" 82.456tez 494736000n 494736000n 35126256n

let test_token_to_xtz_1069 =
  test_quote_token_to_tez_accuracy "ttx_1069" 0.111tez 555000n 555000n 40515n

let test_token_to_xtz_1070 =
  test_quote_token_to_tez_accuracy "ttx_1070" 0.222tez 888000n 888000n 70152n

let test_token_to_xtz_1071 =
  test_quote_token_to_tez_accuracy "ttx_1071" 0.333tez 999000n 999000n 82917n

let test_token_to_xtz_1072 =
  test_quote_token_to_tez_accuracy "ttx_1072" 0.444tez 888000n 888000n 79032n

let test_token_to_xtz_1073 =
  test_quote_token_to_tez_accuracy "ttx_1073" 0.555tez 555000n 555000n 53835n

let test_token_to_xtz_1074 =
  test_quote_token_to_tez_accuracy "ttx_1074" 0.666tez 666000n 666000n 67266n

let test_token_to_xtz_1075 =
  test_quote_token_to_tez_accuracy "ttx_1075" 0.777tez 1554000n 1554000n 160062n

let test_token_to_xtz_1076 =
  test_quote_token_to_tez_accuracy "ttx_1076" 0.888tez 2664000n 2664000n 285048n

let test_token_to_xtz_1077 =
  test_quote_token_to_tez_accuracy "ttx_1077" 1.212tez 1212000n 1212000n 132108n

let test_token_to_xtz_1078 =
  test_quote_token_to_tez_accuracy "ttx_1078" 2.323tez 4646000n 4646000n 524998n

let test_token_to_xtz_1079 =
  test_quote_token_to_tez_accuracy "ttx_1079" 3.434tez 10302000n 10302000n 1308354n

let test_token_to_xtz_1080 =
  test_quote_token_to_tez_accuracy "ttx_1080" 4.545tez 4545000n 4545000n 595395n

let test_token_to_xtz_1081 =
  test_quote_token_to_tez_accuracy "ttx_1081" 5.656tez 11312000n 11312000n 1549744n

let test_token_to_xtz_1082 =
  test_quote_token_to_tez_accuracy "ttx_1082" 6.767tez 20301000n 20301000n 2821839n

let test_token_to_xtz_1083 = test_quote_token_to_tez_accuracy "ttx_1083" 7.878tez 0n 0n 0n

let test_token_to_xtz_1084 = test_quote_token_to_tez_accuracy "ttx_1084" 8.989tez 0n 0n 0n

let test_token_to_xtz_1085 =
  test_quote_token_to_tez_accuracy "ttx_1085" 17.77tez 124390000n 124390000n 19529230n

let test_token_to_xtz_1086 =
  test_quote_token_to_tez_accuracy "ttx_1086" 18.88tez 113280000n 113280000n 18464640n

let test_token_to_xtz_1087 =
  test_quote_token_to_tez_accuracy "ttx_1087" 19.99tez 99950000n 99950000n 16691650n

let test_token_to_xtz_1088 =
  test_quote_token_to_tez_accuracy "ttx_1088" 21.12tez 84480000n 84480000n 14615039n

let test_token_to_xtz_1089 =
  test_quote_token_to_tez_accuracy "ttx_1089" 32.23tez 96689997n 96689997n 17307509n

let test_token_to_xtz_1090 =
  test_quote_token_to_tez_accuracy "ttx_1090" 43.34tez 86680000n 86680000n 15689080n

let test_token_to_xtz_1091 =
  test_quote_token_to_tez_accuracy "ttx_1091" 54.45tez 54450000n 54450000n 10399950n

let test_token_to_xtz_1092 =
  test_quote_token_to_tez_accuracy "ttx_1092" 65.56tez 65560000n 65560000n 12653080n

let test_token_to_xtz_1093 =
  test_quote_token_to_tez_accuracy "ttx_1093" 0.1001tez 200200n 200200n 39439n

let test_token_to_xtz_1094 =
  test_quote_token_to_tez_accuracy "ttx_1094" 0.2002tez 600600n 600600n 119519n

let test_token_to_xtz_1095 =
  test_quote_token_to_tez_accuracy "ttx_1095" 0.3003tez 300300n 300300n 63363n

let test_token_to_xtz_1096 =
  test_quote_token_to_tez_accuracy "ttx_1096" 0.4004tez 800800n 800800n 178578n

let test_token_to_xtz_1097 =
  test_quote_token_to_tez_accuracy "ttx_1097" 0.5005tez 1501497n 1501497n 3002n

let test_token_to_xtz_1098 =
  test_quote_token_to_tez_accuracy "ttx_1098" 0.6006tez 600600n 600600n 1801n

let test_token_to_xtz_1099 =
  test_quote_token_to_tez_accuracy "ttx_1099" 0.7007tez 1401400n 1401400n 7007n

let test_token_to_xtz_1100 =
  test_quote_token_to_tez_accuracy "ttx_1100" 0.8008tez 2402400n 2402400n 16816n
