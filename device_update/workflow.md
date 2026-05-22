## step1 update romloader
- 1.先尝试连接设备，超时时间1分钟，连接成功执行下一步
- 2.先 ping 设备，超时时间 1 分钟，ping 通执行下一步
- 3.检查 vol0:assets/boot/boot_logo.bin 是否存在，如果存在则删除，成功后执行下一步，否则返回第一步
- 4.将 bin/pro2_romloader_v3_msc.bin 文件通过 file write (chunk 1024) 写入路径 vol0:romloader.bin,写入成功执行下一步，否则返回第一步
- 5.将 bin/pro2_boot_update_rom_signed.bin 文件通过 file write 写入路径 vol0:update_rom.bin,写入成功执行下一步，否则返回第一步
- 6.执行 firmware update 指令，类型为 1，路径为 vol0:update_rom.bin，执行成功下进行下一步，否则返回第一步
- 7.执行 reboot 指令，类型为 0，执行成功后等待 20 秒，执行下一步
- 8.先尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 9.执行 reboot 指令，类型为 0，执行成功后等待 40 秒，然后进入step2

## step2 update resources
- 1.先尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 2.通过 sendDiskControl 使能MSC，不判断返回结果，执行完后等待3秒直接进入下一步
- 3.扫描是否有 OneKey OS 盘出现，扫描的超时时间30秒，成功后，等待3秒，执行下一步
- 4.将 assets 目录的所有文件，不保留 assets 目录本身，且保持相对路径不变的情况下，通过 copy_assets.py 拷贝到 OneKey OS 盘中，等待拷贝完成，延时3秒，然后进入下一步
- 5.先尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 6.通过 sendDiskControl 禁用MSC，不判断返回结果，执行完后等待3秒直接进入step3

## step3 update bluetooth
- 1.判断设备是否连接，如果连接直接跳到下一步；否则先尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 2.ping 设备，超时时间 1 分钟，ping 通后等待5秒，执行下一步
- 3.检查 vol0:bluetooth.bin 文件是否存在，如果存在则执行下一步，如果指令超时或者不存在则将 bin/pro2_bluetooth_signed.bin 文件通过 file write 写入路径 vol0:bluetooth.bin, 写入成功执行下一步，否则返回第一步
- 4.执行 firmware update 指令，类型为 2，路径为 vol0:bluetooth.bin，这里不判断firmware update执行结果，直接等待 FirmwareInstallProgress 返回 100%, 则认为成功，然后进入下一步
- 5.先等待 5 秒，然后进入 step4

## step4 update firmware
- 1.先尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 2.执行 reboot 指令，类型为 1，执行成功后 1 秒进入下一步，否则返回第一步
- 3.再尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- 4.ping 设备，超时时间 1 分钟，ping 通后等待5秒，执行下一步
- 5.检查 vol0:core.bin 文件是否存在，如果存在则执行下一步，如果指令超时或者不存在则将 bin/pro2_firmware_signed.bin 文件通过 file write 写入路径 vol0:core.bin，成功执行下一步，否则退出
- 6.执行 firmware update 指令，类型为 1，路径为 vol0:core.bin，这里不判断firmware update执行结果，直接等待 FirmwareInstallProgress 返回 100%, 则认为成功，然后进入下一步
- 7.先等待 10 秒，然后尝试连接设备，超时时间 30 秒

## 要求
- 如果 step2/3 单独执行，则需要先连接设备，然后执行 reboot 指令，类型为 1，执行成功后 1 秒后再尝试连接设备，超时时间 1 分钟，连接成功执行下一步
- step3/4 失败默认再调用一次 workflow.py step3 或 workflow.py step4