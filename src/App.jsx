/* eslint-disable no-unused-vars */
import "./App.css";
import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";
import * as tf from "@tensorflow/tfjs";
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import { initNotifications, notify } from "@mycv/f8-notification";
import soundUrl from "./assets/hey_tay.mp3";
var sound = new Howl({
  src: [soundUrl],
});

function App() {
  // const variable
  const NOT_TOUCH_MODULE = "not_touch";
  const TOUCHED = "touched";
  const TRAINING_TIMES = 50;
  const TOUCHED_PREDICT = 0.8;
  const video = useRef();
  let classifierModule = useRef();
  let mobilenetModule = useRef();
  let canPlaySound = useRef(true);

  const [touched, setTouched] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(true);
  const [trainAI, setTrainAI] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [button1Visible, setButton1Visible] = useState(true);
  const [button2Visible, setButton2Visible] = useState(false);
  const [runVisible, setRunVisible] = useState(false);
  useEffect(() => {
    init();
    sound.on("end", function () {
      canPlaySound.current = true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const init = async () => {
    console.log("init...");
    await setUpCamera();
    console.log("setUp camera success");
    setLoadingMessage("Đang khởi động AI...");

    classifierModule.current = knnClassifier.create();
    mobilenetModule.current = await mobilenet.load();

    console.log("set up done");
    console.log("Dont touch face and press Train 1 ");

    setCameraReady(true);
    setLoadingMessage("");
    setCameraPermission(true);

    initNotifications({ cooldown: 3000 });
  };
  //  HIển thị camera trên thiết bị
  const setUpCamera = async () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          async (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener("loadeddata", async () => {
              resolve(); // Giải phóng Promise
            });
          },
          (error) => {
            reject(error); // Nếu có lỗi thì reject Promise
            setCameraPermission(false);
            setLoadingMessage(""); // Ẩn thông báo lỗi
          }
        );
      } else {
        reject(new Error("Camera not supported")); // Nếu không có camera thì reject
        setCameraPermission(false);
        setLoadingMessage(""); // Ẩn thông báo lỗi
      }
    });
  };
  // Bước 1: Train máy khi không chạm tay
  const train = async (label) => {
    console.log(`${label} đang train face cho máy  `);
    setButton1Visible(false);
    setButton2Visible(false);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Progress ${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`);
      setLoadingMessage(
        `Training Progress: ${parseInt(((i + 1) / TRAINING_TIMES) * 100)}%`
      );
      await training(label);
    }

    if (label == NOT_TOUCH_MODULE) {
      setButton1Visible(false);
      setButton2Visible(true);
    }
    if (label === TOUCHED) {
      setButton2Visible(false);
      setRunVisible(true);
    }
    setTrainAI(true);
    setLoadingMessage("");
  };
  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };
  // Bước 2: Train máy khi chạm tay
  const training = (label) => {
    setTrainAI(false);
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(video.current, true);
      classifierModule.current.addExample(embedding, label);
      await sleep(100);
      resolve();
    });
  };
  // Bước 3:Lấy hình ảnh hiện tại so sánh với hình ảnh đã học trước đó ,
  // Nếu ko khớp thì cảnh báo
  const run = async () => {
    const embedding = mobilenetModule.current.infer(video.current, true);
    const result = await classifierModule.current.predictClass(embedding);

    if (
      result.label === TOUCHED &&
      result.confidences[result.label] > TOUCHED_PREDICT
    ) {
      console.log("touched");
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }
      setLoadingMessage("Bỏ tay ra ddeeee!!! ");
      notify("Bỏ tay ra", { body: "Bạn vừa chạm tay vào mặt!!!" });
      setTouched(true);
    } else {
      console.log("not_touched");
      setTouched(false);
      setLoadingMessage("");
    }
    await sleep(1000);
    run();
  };
  return (
    <div className={`main ${touched ? "touched" : ""}`}>
      <span className="title">
        Web cảnh báo chạm tay (hoặc bất kì điều gì muốn đối chiếu){" "}
      </span>
      <video ref={video} className="video" autoPlay />
      {!cameraPermission && (
        <span className="camera_noti">
          Vui lòng cấp quyền camera và thông báo để tiếp tục sử dụng.
        </span>
      )}
      {loadingMessage && (
        <span className="loading-message">{loadingMessage}</span>
      )}
      {cameraReady && cameraPermission && (
        <div className="control">
          {button1Visible && (
            <>
              <span>
                Bước 1: Train máy khi không chạm tay và cử động thoải mái nhất
                để máy học cử chỉ
              </span>
              <br />
              <button onClick={() => train(NOT_TOUCH_MODULE)} className="btn">
                Train 1
              </button>
            </>
          )}
          {button2Visible && (
            <>
              <span>
                Bước 2: Train máy khi chạm tay và cử động thoải mái nhất để máy
                học cử chỉ
              </span>
              <br />
              <button onClick={() => train(TOUCHED)} className="btn">
                Train 2
              </button>
            </>
          )}
          {runVisible && (
            <>
              <span>Bước 3: Thành công rồi mặc dù nó vẫn nguu</span>
              <br />
              <button onClick={() => run()} className="btn">
                Run
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
