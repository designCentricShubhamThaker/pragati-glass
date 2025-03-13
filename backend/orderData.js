export const Orders = [
  {
    "order_number": "30",
    "dispatcher_name": "abc",
    "customer_name": "xyz",
    "created_at": new Date().toLocaleDateString(),
    "order_status": "Pending",
    "order_details": {
      "glass": [
        {
          "glass_name": "Bottle",
          "quantity": 100,
          "weight": "500g",
          "neck_size": "30mm",
          "decoration_details": {
            "type": "Printing",
            "decoration_number": "D001"
          },
          "team": "Glass Manufacturing Team",
          "status": "Done"
        }
      ],
      "caps": [
        {
          "cap_name": "Plastic Cap",
          "neck_size": "30mm",
          "quantity": 100,
          "process": "Non-Metalized",
          "option": "Plastic",
          "team": "Cap Manufacturing Team",
          "status": "Done"
        },
        {
          "cap_name": "Metal Cap",
          "neck_size": "30mm",
          "quantity": 50,
          "process": "Metalized",
          "option": "Aluminium",
          "team": "Cap Manufacturing Team",
          "status": "Pending"
        }
      ],
      "boxes": [
        {
          "box_name": "Carton Box",
          "quantity": 20,
          "approval_code": "APPROVAL123",
          "team": "Packaging Team",
          "status": "Pending"
        }
      ],
      "pumps": [
        {
          "pump_name": "Dispenser Pump",
          "neck_size": "30mm",
          "type": "Lotion Pump",
          "quantity": 100,
          "team": "Pump Manufacturing Team",
          "status": "Pending"
        },
        {
          "pump_name": "Spray Pump",
          "neck_size": "30mm",
          "type": "Mist Pump",
          "quantity": 50,
          "team": "Pump Manufacturing Team",
          "status": "Pending"
        }
      ]
    }
  },
  {
    "order_number": "31",
    "dispatcher_name": "def",
    "customer_name": "uvw",
    "created_at": new Date().toLocaleDateString(),
    "order_status": "Pending",
    "order_details": {
      "glass": [
        {
          "glass_name": "Jar",
          "quantity": 200,
          "weight": "300g",
          "neck_size": "25mm",
          "decoration_details": {
            "type": "Coating",
            "decoration_number": "D002"
          },
          "team": "Glass Manufacturing Team",
          "status": "Done"
        }
      ],
      "caps": [
        {
          "cap_name": "Metal Cap",
          "neck_size": "25mm",
          "quantity": 200,
          "process": "Metalized",
          "option": "Aluminium",
          "team": "Cap Manufacturing Team",
          "status": "Pending"
        }
      ],
      "boxes": [
        {
          "box_name": "Plastic Box",
          "quantity": 40,
          "approval_code": "APPROVAL456",
          "team": "Packaging Team",
          "status": "Pending"
        }
      ],
      "pumps": [
        {
          "pump_name": "Spray Pump",
          "neck_size": "25mm",
          "type": "Mist Pump",
          "quantity": 200,
          "team": "Pump Manufacturing Team",
          "status": "Pending"
        }
      ]
    }
  }
]
