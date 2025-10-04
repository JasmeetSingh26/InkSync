#!/bin/bash
# InkSync Service Scaling Script

echo "🚀 InkSync Service Scaling Helper"
echo "================================="

# Function to show current status
show_status() {
    echo "📊 Current service status:"
    docker-compose ps --format "table {{.Service}}\t{{.State}}\t{{.Ports}}"
}

# Function to scale services
scale_services() {
    echo "🔧 Scaling services..."
    
    # Parse arguments or use defaults
    ROOM_SCALE=${1:-1}
    CHAT_SCALE=${2:-1}
    DRAWING_SCALE=${3:-1}
    WEBSOCKET_SCALE=${4:-1}
    
    echo "📈 Scaling to:"
    echo "  - Room Service: $ROOM_SCALE instances"
    echo "  - Chat Service: $CHAT_SCALE instances"
    echo "  - Drawing Service: $DRAWING_SCALE instances"
    echo "  - WebSocket Gateway: $WEBSOCKET_SCALE instances"
    
    docker-compose up -d \
        --scale room-service=$ROOM_SCALE \
        --scale chat-service=$CHAT_SCALE \
        --scale drawing-service=$DRAWING_SCALE \
        --scale websocket-gateway=$WEBSOCKET_SCALE
    
    echo "✅ Scaling complete!"
}

# Function to show scaling examples
show_examples() {
    echo "📋 Scaling Examples:"
    echo ""
    echo "  Basic scaling:"
    echo "    ./scale.sh 2 3 1 2"
    echo "    (2 room, 3 chat, 1 drawing, 2 websocket)"
    echo ""
    echo "  High traffic scenario:"
    echo "    ./scale.sh 3 5 2 3"
    echo ""
    echo "  Scale down to save resources:"
    echo "    ./scale.sh 1 1 1 1"
    echo ""
    echo "  Individual service scaling:"
    echo "    docker-compose up --scale chat-service=5 -d"
}

# Main script logic
case "${1:-status}" in
    "status")
        show_status
        ;;
    "examples")
        show_examples
        ;;
    "help")
        echo "Usage: $0 [room_scale] [chat_scale] [drawing_scale] [websocket_scale]"
        echo "       $0 status     - Show current status"
        echo "       $0 examples   - Show scaling examples"
        show_examples
        ;;
    *)
        scale_services $1 $2 $3 $4
        echo ""
        show_status
        ;;
esac