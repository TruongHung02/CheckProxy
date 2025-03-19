import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { URL } from "url";

// Định nghĩa kiểu proxy
interface Proxy {
  host: string;
  port: number;
  protocol: "http" | "https";
  username?: string;
  password?: string;
}

// Thời gian timeout cho mỗi lần kiểm tra proxy (ms)
const TIMEOUT = 5000;

// URL dùng để test proxy
const TEST_URL = "https://api64.ipify.org/";

/**
 * Hàm parse chuỗi proxy thành đối tượng Proxy
 */
function parseProxy(proxyStr: string): Proxy | null {
  try {
    // Xử lý định dạng [protocol://][username:password@]host:port
    let protocol: "http" | "https" = "http";
    let auth: string | undefined;
    let hostPort: string = proxyStr;

    if (proxyStr.includes("://")) {
      const parts = proxyStr.split("://");
      protocol = parts[0].toLowerCase() as "http" | "https";
      hostPort = parts[1];
    }

    if (hostPort.includes("@")) {
      const parts = hostPort.split("@");
      auth = parts[0];
      hostPort = parts[1];
    }

    const [host, portStr] = hostPort.split(":");
    const port = parseInt(portStr, 10);

    if (!host || isNaN(port)) {
      console.error(`Invalid proxy format: ${proxyStr}`);
      return null;
    }

    const proxy: Proxy = { host, port, protocol };

    if (auth) {
      const [username, password] = auth.split(":");
      proxy.username = username;
      proxy.password = password;
    }

    // //Chỉnh sửa format proxy
    // const [host1, port1, username, password] = proxyStr.split(":");
    // return {
    //   host: host1,
    //   port: Number(port1),
    //   protocol: "http",
    //   username,
    //   password,
    // };

    return proxy;
  } catch (error) {
    console.error(`Error parsing proxy ${proxyStr}: ${error}`);
    return null;
  }
}

/**
 * Hàm kiểm tra proxy có hoạt động không
 */
async function checkProxy(proxy: Proxy): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      host: proxy.host,
      port: proxy.port,
      path: TEST_URL,
      method: "GET",
      timeout: TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    };

    // Thêm xác thực nếu có
    if (proxy.username && proxy.password) {
      const auth = Buffer.from(`${proxy.username}:${proxy.password}`).toString(
        "base64"
      );
      options.headers["Proxy-Authorization"] = `Basic ${auth}`;
    }

    const requester = proxy.protocol === "https" ? https : http;

    const req = requester.request(options, (res) => {
      // Nếu có phản hồi là proxy hoạt động
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume(); // Giải phóng bộ nhớ
    });

    req.on("error", (err) => {
      console.log(`Proxy ${proxy.host}:${proxy.port} error: ${err.message}`);
      resolve(false);
    });

    req.on("timeout", () => {
      console.log(`Proxy ${proxy.host}:${proxy.port} timeout`);
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Hàm chính để đọc danh sách proxy, kiểm tra và ghi kết quả
 */
async function checkProxies(
  inputFile: string,
  outputFile: string
): Promise<void> {
  try {
    // Đọc file danh sách proxy
    const proxiesText = fs.readFileSync(inputFile, "utf8");
    const proxyStrings = proxiesText
      .split("\n")
      .filter((line) => line.trim() !== "");

    console.log(`Đã đọc ${proxyStrings.length} proxy từ file`);

    const proxies: Proxy[] = [];

    // Parse các proxy
    for (const proxyStr of proxyStrings) {
      const proxy = parseProxy(proxyStr.trim());
      if (proxy) {
        proxies.push(proxy);
      }
    }

    console.log(`Bắt đầu kiểm tra ${proxies.length} proxy...`);

    const workingProxies: string[] = [];
    const promises: Promise<void>[] = [];

    // Kiểm tra từng proxy
    for (const proxy of proxies) {
      const promise = (async () => {
        const isWorking = await checkProxy(proxy);
        if (isWorking) {
          const proxyStr = `${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
          console.log(`Proxy hoạt động: ${proxyStr}`);
          workingProxies.push(proxyStr);
        }
      })();

      promises.push(promise);
    }

    // Đợi tất cả các proxy được kiểm tra
    await Promise.all(promises);

    // Ghi các proxy hoạt động vào file output
    fs.writeFileSync(outputFile, workingProxies.join("\n"), "utf8");

    console.log(
      `Đã hoàn thành kiểm tra. Tìm thấy ${workingProxies.length} proxy hoạt động.`
    );
    console.log(`Kết quả đã được lưu vào ${outputFile}`);
  } catch (error) {
    console.error(`Lỗi: ${error}`);
  }
}

// Thực thi chương trình
const inputFile = "proxies.txt"; // File danh sách proxy đầu vào
const outputFile = "output.txt"; // File danh sách proxy hoạt động đầu ra

console.log("Bắt đầu chương trình kiểm tra proxy...");
checkProxies(inputFile, outputFile);
