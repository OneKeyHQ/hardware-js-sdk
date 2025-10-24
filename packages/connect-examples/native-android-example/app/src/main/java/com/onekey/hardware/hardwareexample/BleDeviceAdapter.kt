package com.onekey.hardware.hardwareexample

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import no.nordicsemi.android.kotlin.ble.scanner.aggregator.BleScanResultAggregator
import no.nordicsemi.android.kotlin.ble.core.ServerDevice

class BleDeviceAdapter(
    private val onDeviceClick: (String) -> Unit
) : RecyclerView.Adapter<BleDeviceAdapter.ViewHolder>() {

    private var devices = mutableListOf<ServerDevice>()

    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val deviceName: TextView = view.findViewById(android.R.id.text1)
        val deviceAddress: TextView = view.findViewById(android.R.id.text2)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(android.R.layout.simple_list_item_2, parent, false)
        return ViewHolder(view)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val device = devices[position]
        holder.deviceName.text = device.name ?: "Unknown Device"
        holder.deviceAddress.text = device.address
        
        holder.itemView.isClickable = true
        holder.itemView.isFocusable = true
        holder.itemView.setOnClickListener { 
            onDeviceClick(device.address)
        }
    }

    override fun getItemCount() = devices.size

    fun updateDevices(newDevices: List<ServerDevice>) {
        devices.clear()
        devices.addAll(newDevices)
        notifyDataSetChanged()
    }
} 