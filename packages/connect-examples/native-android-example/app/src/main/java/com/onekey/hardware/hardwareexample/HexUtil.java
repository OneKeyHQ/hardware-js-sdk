package com.onekey.hardware.hardwareexample;

public class HexUtil {
  /**
   * 16 进制数组转成 16 进制字符串
   */
  public static String toHex(byte[] bytes) {
    if (bytes == null) {
      return "";
    }
    final char[] hexArray = {'0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'};
    char[] hexChars = new char[bytes.length * 2];
    int v;
    for (int j = 0; j < bytes.length; j++) {
      v = bytes[j] & 0xFF;
      hexChars[j * 2] = hexArray[v >>> 4];
      hexChars[j * 2 + 1] = hexArray[v & 0x0F];
    }
    return new String(hexChars);
  }

  /**
   * 16 进制字符串转换16 进制数组
   */
  public static byte[] fromHex(String s) {
    if (s != null) {
      try {
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
          char ch = s.charAt(i);
          if (!Character.isWhitespace(ch)) {
            sb.append(ch);
          }
        }
        s = sb.toString();
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
          int hi = (Character.digit(s.charAt(i), 16) << 4);
          int low = Character.digit(s.charAt(i + 1), 16);
          if (hi >= 256 || low < 0 || low >= 16) {
            return null;
          }
          data[i / 2] = (byte) (hi | low);
        }
        return data;
      } catch (Exception ignored) {
      }
    }
    return null;
  }
}
