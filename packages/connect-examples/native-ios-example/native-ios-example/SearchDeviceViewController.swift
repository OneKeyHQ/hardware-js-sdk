//
//  SearchDeviceViewController.swift
//  设备搜索结果原生列表（带搜索）
//
//  仅处理 UI 展示与筛选，不涉及业务逻辑。
//

import UIKit

class SearchDeviceViewController: UITableViewController, UISearchResultsUpdating {
    // 原始设备列表与搜索结果
    private let devices: [[String: String]]
    private var filtered: [[String: String]]

    // 选择回调（id/name）
    private let onSelect: (String, String) -> Void

    // 搜索控制器
    private let searchController = UISearchController(searchResultsController: nil)

    // MARK: - 初始化
    init(devices: [[String: String]], onSelect: @escaping (String, String) -> Void) {
        self.devices = devices
        self.filtered = devices
        self.onSelect = onSelect
        super.init(style: .insetGrouped)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    // MARK: - 生命周期
    override func viewDidLoad() {
        super.viewDidLoad()

        title = "Select a Device"
        navigationItem.rightBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(didTapCancel))

        // 注册系统样式的单元格
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "DeviceCell")

        // 配置搜索
        searchController.searchResultsUpdater = self
        searchController.obscuresBackgroundDuringPresentation = false
        searchController.searchBar.placeholder = "Search devices"
        navigationItem.searchController = searchController
        definesPresentationContext = true
    }

    // MARK: - 动作
    @objc private func didTapCancel() {
        dismiss(animated: true)
    }

    // MARK: - UISearchResultsUpdating
    func updateSearchResults(for searchController: UISearchController) {
        let keyword = (searchController.searchBar.text ?? "").lowercased()
        if keyword.isEmpty {
            filtered = devices
        } else {
            filtered = devices.filter { dict in
                let name = (dict["name"] ?? "").lowercased()
                let id = (dict["id"] ?? "").lowercased()
                return name.contains(keyword) || id.contains(keyword)
            }
        }
        tableView.reloadData()
    }

    // MARK: - TableView 数据源
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filtered.count
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "DeviceCell", for: indexPath)
        let item = filtered[indexPath.row]
        let name = item["name"] ?? "Unnamed Device"
        let id = item["id"] ?? ""
        var content = cell.defaultContentConfiguration()
        content.text = name
        content.secondaryText = id
        cell.contentConfiguration = content
        cell.accessoryType = .disclosureIndicator
        return cell
    }

    // MARK: - TableView 交互
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let item = filtered[indexPath.row]
        let name = item["name"] ?? "Unnamed Device"
        let id = item["id"] ?? ""
        onSelect(id, name)
        dismiss(animated: true)
    }
}

